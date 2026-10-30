import type { Data } from "@puckeditor/core";

import { convertToShopifyBody } from "~/lib/convert-to-shopify-body";
import { titleFromVisbuildData } from "~/lib/page-version";
import {
  blockedRanges,
  derivePageStatus,
  findConflict,
  pickFallbackEvergreen,
  truncateToMinute,
  validateLiveUnpublish,
  validateWindow,
} from "~/lib/schedule-window";
import { visbuildDataEqual } from "~/lib/visbuild-data-equal";
import { isDevPlaceholderShopToken } from "./dev-auth.server";
import { validatePageHandleForShop } from "./handle-conflict.server";
import { createAdminClient, type ShopifyAdminClient } from "./shopify";
import type {
  JobKind,
  PageIndex,
  PageVersionSummary,
  PublishJob,
  ServerContext,
  VersionSchedule,
} from "./types";

const MAX_ATTEMPTS = 5;

/**
 * EventBridge Scheduler rejects one-time targets less than ~1 min in the
 * future. Floor every retry above that limit.
 */
const RETRY_MIN_LEAD_MS = 75_000;

class FatalJobError extends Error {}

class SkippedJob extends Error {}

class MissingTokenError extends Error {}

function backoffMs(attempts: number): number {
  return Math.min(60_000, 2 ** attempts * 1000);
}

function retryDelayMs(attempts: number): number {
  return Math.max(backoffMs(attempts), RETRY_MIN_LEAD_MS);
}

/** dev-login 写入的占位 token 无法调 Shopify；本地跳过 API 以便验证发布/版本逻辑。 */
function shouldMockShopifyApi(token: string | null): boolean {
  return isDevPlaceholderShopToken(token);
}

async function shopTokenForIndex(
  ctx: ServerContext,
  index: PageIndex,
): Promise<string> {
  const shop = await ctx.repo.getShop(index.shopId);
  if (!shop) throw new Error("Shop not found");
  const token = await ctx.secrets.getShopToken(shop.id);
  if (!token) throw new MissingTokenError("Shop access token not configured");
  return token;
}

async function shopifyClientForIndex(
  ctx: ServerContext,
  index: PageIndex,
): Promise<ShopifyAdminClient> {
  const shop = await ctx.repo.getShop(index.shopId);
  if (!shop) throw new Error("Shop not found");
  const token = await shopTokenForIndex(ctx, index);
  return createAdminClient({
    shopDomain: shop.domain,
    accessToken: token,
  });
}

/**
 * Create on Shopify when no GID; otherwise update and force the page visible.
 * Returns the Shopify page GID, which differs from the index when a page was created.
 */
async function pushPageToShopify(
  ctx: ServerContext,
  index: PageIndex,
  html: string,
): Promise<string> {
  const token = await shopTokenForIndex(ctx, index);
  if (shouldMockShopifyApi(token)) {
    return index.shopifyPageGid ?? `gid://shopify/Page/dev-${index.pageId}`;
  }

  const client = await shopifyClientForIndex(ctx, index);

  let gid = index.shopifyPageGid;
  if (gid) {
    const existing = await client.getPage(gid);
    if (!existing) gid = null;
  }

  if (!gid) {
    const created = await client.pageCreate({
      title: index.title,
      handle: index.handle,
      body: html,
      isPublished: true,
    });
    return created.id;
  }

  await client.pageUpdate({
    id: gid,
    title: index.title,
    handle: index.handle,
    body: html,
    isPublished: true,
  });
  return gid;
}

export async function hidePageOnShopify(
  ctx: ServerContext,
  index: PageIndex,
): Promise<void> {
  if (!index.shopifyPageGid) return;
  const token = await shopTokenForIndex(ctx, index);
  if (shouldMockShopifyApi(token)) return;
  const client = await shopifyClientForIndex(ctx, index);
  const existing = await client.getPage(index.shopifyPageGid);
  if (!existing || !existing.isPublished) return;
  await client.pageUpdate({
    id: index.shopifyPageGid,
    isPublished: false,
  });
}

/** Refuses when the shop has no token, so the local page is never removed while its Shopify page survives. */
export async function deleteShopifyPage(
  ctx: ServerContext,
  index: PageIndex,
): Promise<void> {
  if (!index.shopifyPageGid) return;
  let client: ShopifyAdminClient;
  try {
    const token = await shopTokenForIndex(ctx, index);
    if (shouldMockShopifyApi(token)) return;
    client = await shopifyClientForIndex(ctx, index);
  } catch (err) {
    if (err instanceof MissingTokenError) {
      throw new Error(
        "This page can't be deleted: the shop's Shopify access token is not configured, so the Shopify page can't be removed. Reconnect the shop and try again.",
      );
    }
    throw err;
  }
  try {
    await client.pageDelete(index.shopifyPageGid);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/not found|does not exist/i.test(message)) return;
    throw err;
  }
}

function earliestPendingPublishAt(schedules: VersionSchedule[]): string | null {
  const pending = schedules
    .filter((schedule) => schedule.status === "pending")
    .map((schedule) => schedule.publishAt)
    .sort();
  return pending[0] ?? null;
}

export async function refreshPageScheduleState(
  ctx: ServerContext,
  pageId: string,
  /** Pass when the caller just wrote the newest version, to skip listing all versions. */
  knownLatestVersionId?: string,
): Promise<void> {
  const index = await ctx.repo.getPageIndex(pageId);
  if (!index) return;
  const [schedules, latestVersionId] = await Promise.all([
    ctx.repo.listVersionSchedules(pageId),
    knownLatestVersionId
      ? Promise.resolve(knownLatestVersionId)
      : ctx.repo
          .listPageVersions(pageId)
          .then((versions) => versions[0]?.versionId ?? null),
  ]);
  await ctx.repo.patchPageIndex(index, {
    scheduledPublishAt: earliestPendingPublishAt(schedules),
    status: derivePageStatus({
      schedules,
      liveVersionId: index.liveVersionId,
      latestVersionId,
      lastPublishedAt: index.lastPublishedAt,
    }),
    updatedAt: new Date().toISOString(),
  });
}

async function cancelJobFully(
  ctx: ServerContext,
  jobId: string | null,
): Promise<void> {
  if (!jobId) return;
  await ctx.repo.cancelJob(jobId);
  await ctx.scheduler.cancel(jobId);
}

/** Old jobs are already orphaned (executors check the schedule's job ids), so failures only log. */
async function cancelSupersededJobs(
  ctx: ServerContext,
  jobIds: Array<string | null>,
): Promise<void> {
  for (const jobId of jobIds) {
    try {
      await cancelJobFully(ctx, jobId);
    } catch (err) {
      console.warn(`[schedule] failed to cancel superseded job ${jobId}`, err);
    }
  }
}

function makeJob(input: {
  jobId: string;
  pageId: string;
  shopId: string;
  versionId: string;
  kind: PublishJob["kind"];
  runAt: Date;
  timezone: string;
  now: string;
}): PublishJob {
  return {
    jobId: input.jobId,
    pageId: input.pageId,
    shopId: input.shopId,
    payloadVersionId: input.versionId,
    kind: input.kind,
    runAt: input.runAt.toISOString(),
    timezone: input.timezone,
    status: "pending",
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    lastError: null,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

/** Schedules and persists jobs; on any failure the ones already created are rolled back. */
async function createJobs(
  ctx: ServerContext,
  index: PageIndex,
  versionId: string,
  timezone: string,
  specs: Array<{ kind: JobKind; runAt: Date }>,
): Promise<string[]> {
  const now = new Date().toISOString();
  const created: string[] = [];
  try {
    for (const spec of specs) {
      const jobId = crypto.randomUUID();
      created.push(jobId);
      await ctx.repo.putJob(
        makeJob({
          jobId,
          pageId: index.pageId,
          shopId: index.shopId,
          versionId,
          kind: spec.kind,
          runAt: spec.runAt,
          timezone,
          now,
        }),
      );
      await ctx.scheduler.scheduleAt({ jobId, runAt: spec.runAt, timezone });
    }
    return created;
  } catch (err) {
    await cancelSupersededJobs(ctx, created);
    throw err;
  }
}

function overlapMessage(
  versions: PageVersionSummary[],
  versionId: string,
): string {
  const version = versions.find((item) => item.versionId === versionId);
  const label = version
    ? `${version.title} (Version ${version.versionNumber})`
    : "another version";
  return `That time overlaps ${label}`;
}

export async function scheduleVersion(
  ctx: ServerContext,
  params: {
    pageId: string;
    versionId: string;
    publishAt: Date;
    unpublishAt: Date | null;
    timezone: string;
  },
): Promise<void> {
  const index = await ctx.repo.getPageIndex(params.pageId);
  if (!index) throw new Error("Page not found");
  const handleCheck = await validatePageHandleForShop(
    ctx,
    index.shopId,
    index.pagePath,
    {
      excludePageId: params.pageId,
      excludeShopifyGid: index.shopifyPageGid,
    },
  );
  if (!handleCheck.ok) throw new Error(handleCheck.error);
  const version = await ctx.repo.getPageVersion(params.versionId);
  if (!version || version.pageId !== params.pageId) {
    throw new Error("Version not found");
  }

  const publishAt = truncateToMinute(params.publishAt);
  const unpublishAt = params.unpublishAt
    ? truncateToMinute(params.unpublishAt)
    : null;
  const timezone = params.timezone || "UTC";
  const schedules = await ctx.repo.listVersionSchedules(params.pageId);
  const existing =
    schedules.find((schedule) => schedule.versionId === params.versionId) ?? null;
  const windowError =
    existing?.status === "live"
      ? validateLiveUnpublish({ publishAt, unpublishAt })
      : validateWindow({ publishAt, unpublishAt });
  if (windowError) throw new Error(windowError);

  if (existing?.status === "live") {
    const locked = truncateToMinute(new Date(existing.publishAt)).getTime();
    if (locked !== publishAt.getTime()) {
      throw new Error("Publish time cannot change after the version is live");
    }
  }

  const conflict = findConflict(
    { publishAt, unpublishAt },
    blockedRanges(schedules, params.versionId),
  );
  if (conflict) {
    const versions = await ctx.repo.listPageVersions(params.pageId);
    throw new Error(overlapMessage(versions, conflict.versionId));
  }

  if (existing?.status === "live") {
    await syncLiveUnpublish(ctx, index, existing, schedules, unpublishAt, timezone);
    return;
  }

  const [publishJobId, unpublishJobId = null] = await createJobs(
    ctx,
    index,
    params.versionId,
    timezone,
    [
      { kind: "publish", runAt: publishAt },
      ...(unpublishAt ? [{ kind: "unpublish" as const, runAt: unpublishAt }] : []),
    ],
  );

  const now = new Date().toISOString();
  const schedule: VersionSchedule = {
    versionId: params.versionId,
    pageId: index.pageId,
    shopId: index.shopId,
    publishAt: publishAt.toISOString(),
    unpublishAt: unpublishAt ? unpublishAt.toISOString() : null,
    timezone,
    publishJobId,
    unpublishJobId,
    status: "pending",
    publishedAt: null,
    unpublishedAt: null,
    lastError: null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  try {
    await ctx.repo.putVersionSchedule(schedule);
  } catch (err) {
    await cancelSupersededJobs(ctx, [publishJobId, unpublishJobId]);
    throw err;
  }
  if (existing) {
    await cancelSupersededJobs(ctx, [existing.publishJobId, existing.unpublishJobId]);
  }
  await refreshPageScheduleState(ctx, index.pageId);
}

async function syncLiveUnpublish(
  ctx: ServerContext,
  index: PageIndex,
  existing: VersionSchedule,
  schedules: VersionSchedule[],
  unpublishAt: Date | null,
  timezone: string,
): Promise<void> {
  const previous = existing.unpublishAt
    ? truncateToMinute(new Date(existing.unpublishAt)).getTime()
    : null;
  const next = unpublishAt ? unpublishAt.getTime() : null;
  if (previous === next) return;

  const [unpublishJobId = null] = unpublishAt
    ? await createJobs(ctx, index, existing.versionId, timezone, [
        { kind: "unpublish", runAt: unpublishAt },
      ])
    : [];

  const previousJobId = existing.unpublishJobId;
  const now = new Date().toISOString();
  const updated: VersionSchedule = {
    ...existing,
    unpublishAt: unpublishAt ? unpublishAt.toISOString() : null,
    unpublishJobId,
    timezone: timezone || existing.timezone,
    updatedAt: now,
  };
  try {
    await ctx.repo.putVersionSchedule(updated);
  } catch (err) {
    await cancelSupersededJobs(ctx, [unpublishJobId]);
    throw err;
  }
  await cancelSupersededJobs(ctx, [previousJobId]);

  let evergreenVersionId = index.evergreenVersionId;
  if (!unpublishAt) {
    evergreenVersionId = existing.versionId;
  } else if (evergreenVersionId === existing.versionId) {
    const versions = await ctx.repo.listPageVersions(index.pageId);
    evergreenVersionId = pickFallbackEvergreen({
      versions,
      schedules: schedules.map((schedule) =>
        schedule.versionId === updated.versionId ? updated : schedule,
      ),
      excludeVersionId: existing.versionId,
      clearedAt: index.evergreenClearedAt,
    });
  }
  if (evergreenVersionId !== index.evergreenVersionId) {
    await ctx.repo.patchPageIndex(index, { evergreenVersionId, updatedAt: now });
  }
  await refreshPageScheduleState(ctx, index.pageId);
}

/** Cancels every pending version schedule (same as unschedule per version). */
export async function cancelAllPendingSchedulesForPage(
  ctx: ServerContext,
  pageId: string,
): Promise<void> {
  const schedules = await ctx.repo.listVersionSchedules(pageId);
  for (const schedule of schedules) {
    if (schedule.status !== "pending") continue;
    await cancelVersionSchedule(ctx, pageId, schedule.versionId);
  }
}

export async function cancelVersionSchedule(
  ctx: ServerContext,
  pageId: string,
  versionId: string,
): Promise<void> {
  const schedule = await ctx.repo.getVersionSchedule(pageId, versionId);
  if (!schedule) return;
  if (schedule.status !== "pending" && schedule.status !== "failed") return;
  await cancelJobFully(ctx, schedule.publishJobId);
  await cancelJobFully(ctx, schedule.unpublishJobId);
  schedule.status = "cancelled";
  schedule.publishJobId = null;
  schedule.unpublishJobId = null;
  schedule.updatedAt = new Date().toISOString();
  await ctx.repo.putVersionSchedule(schedule);
  await refreshPageScheduleState(ctx, pageId);
}

export async function cancelAllPageJobs(
  ctx: ServerContext,
  pageId: string,
): Promise<void> {
  const schedules = await ctx.repo.listVersionSchedules(pageId);
  for (const schedule of schedules) {
    if (schedule.status !== "pending" && schedule.status !== "live") continue;
    await cancelJobFully(ctx, schedule.publishJobId);
    await cancelJobFully(ctx, schedule.unpublishJobId);
  }
}

async function markScheduleFailed(
  ctx: ServerContext,
  job: PublishJob,
  message: string,
): Promise<void> {
  const schedule = await ctx.repo.getVersionSchedule(job.pageId, job.payloadVersionId);
  if (!schedule) return;
  if (job.kind !== "publish") {
    if (schedule.unpublishJobId !== job.jobId) return;
    schedule.lastError = message;
    schedule.updatedAt = new Date().toISOString();
    await ctx.repo.putVersionSchedule(schedule);
    return;
  }
  if (schedule.status !== "pending") return;
  if (schedule.publishJobId !== job.jobId) return;
  schedule.status = "failed";
  schedule.lastError = message;
  schedule.updatedAt = new Date().toISOString();
  await ctx.repo.putVersionSchedule(schedule);
  await refreshPageScheduleState(ctx, job.pageId);
}

async function executePublish(job: PublishJob, ctx: ServerContext): Promise<void> {
  const index = await ctx.repo.getPageIndex(job.pageId);
  if (!index) throw new FatalJobError("Page not found");
  const schedule = await ctx.repo.getVersionSchedule(job.pageId, job.payloadVersionId);
  if (!schedule) throw new FatalJobError("Schedule not found");
  if (schedule.publishJobId !== job.jobId) {
    throw new SkippedJob("Job was superseded");
  }
  if (schedule.status !== "pending") {
    throw new SkippedJob(`Schedule is ${schedule.status}`);
  }
  const version = await ctx.repo.getPageVersion(schedule.versionId);
  if (!version) throw new FatalJobError("Version snapshot not found");

  const html = convertToShopifyBody(version.visbuildData);
  const gid = await pushPageToShopify(ctx, index, html);

  const publishedAt = new Date().toISOString();
  schedule.status = "live";
  schedule.publishedAt = publishedAt;
  schedule.lastError = null;
  schedule.updatedAt = publishedAt;
  await ctx.repo.putVersionSchedule(schedule);

  await ctx.repo.patchPageIndex(index, {
    shopifyPageGid: gid,
    liveVersionId: version.versionId,
    lastPublishedAt: publishedAt,
    ...(schedule.unpublishAt ? {} : { evergreenVersionId: version.versionId }),
    updatedAt: publishedAt,
  });
  await refreshPageScheduleState(ctx, index.pageId);
}

async function executeUnpublish(job: PublishJob, ctx: ServerContext): Promise<void> {
  const index = await ctx.repo.getPageIndex(job.pageId);
  if (!index) throw new FatalJobError("Page not found");
  const schedule = await ctx.repo.getVersionSchedule(job.pageId, job.payloadVersionId);
  if (!schedule) throw new FatalJobError("Schedule not found");
  if (schedule.unpublishJobId !== job.jobId) {
    throw new SkippedJob("Job was superseded");
  }
  if (schedule.status !== "live") {
    throw new SkippedJob(`Schedule is ${schedule.status}`);
  }

  const evergreenId = index.evergreenVersionId;
  let liveVersionId: string | null = null;
  let gid = index.shopifyPageGid;
  if (evergreenId && evergreenId !== schedule.versionId) {
    const evergreen = await ctx.repo.getPageVersion(evergreenId);
    if (!evergreen) throw new FatalJobError("Evergreen version not found");
    const html = convertToShopifyBody(evergreen.visbuildData);
    gid = await pushPageToShopify(ctx, index, html);
    liveVersionId = evergreen.versionId;
  } else {
    await hidePageOnShopify(ctx, index);
  }

  const now = new Date().toISOString();
  schedule.status = "ended";
  schedule.unpublishedAt = now;
  schedule.lastError = null;
  schedule.updatedAt = now;
  await ctx.repo.putVersionSchedule(schedule);
  await ctx.repo.patchPageIndex(index, {
    shopifyPageGid: gid,
    liveVersionId,
    updatedAt: now,
  });
  await refreshPageScheduleState(ctx, index.pageId);
}

export async function runScheduledJob(
  jobId: string,
  ctx: ServerContext,
): Promise<void> {
  const { repo } = ctx;
  const job = await repo.getJob(jobId);
  if (!job) return;
  if (job.status === "cancelled" || job.status === "done") return;

  job.status = "running";
  job.updatedAt = new Date().toISOString();
  await repo.putJob(job);

  try {
    if (job.kind === "unpublish") await executeUnpublish(job, ctx);
    else await executePublish(job, ctx);
    job.status = "done";
    job.lastError = null;
    job.updatedAt = new Date().toISOString();
    await repo.putJob(job);
  } catch (err) {
    if (err instanceof SkippedJob) {
      job.status = "done";
      job.lastError = null;
      job.updatedAt = new Date().toISOString();
      await repo.putJob(job);
      return;
    }

    const message = err instanceof Error ? err.message : String(err);
    const fatal = err instanceof FatalJobError;
    job.attempts += 1;
    job.lastError = message;
    job.updatedAt = new Date().toISOString();

    if (fatal || job.attempts >= (job.maxAttempts ?? MAX_ATTEMPTS)) {
      job.status = "failed";
      await repo.putJob(job);
      await markScheduleFailed(ctx, job, message);
      return;
    }

    const retryAt = new Date(Date.now() + retryDelayMs(job.attempts));
    job.status = "pending";
    job.runAt = retryAt.toISOString();
    await repo.putJob(job);
    await ctx.scheduler.scheduleAt({ jobId: job.jobId, runAt: retryAt });
  }
}

export async function publishPageNow(
  pageId: string,
  ctx: ServerContext,
  visbuildData: Data,
  options?: { versionId?: string },
): Promise<void> {
  const index = await ctx.repo.getPageIndex(pageId);
  if (!index) throw new Error("Page not found");

  const now = new Date().toISOString();
  let versionId = options?.versionId?.trim() || "";
  let html: string;
  let bodyData: Data;

  if (versionId) {
    const existing = await ctx.repo.getPageVersion(versionId);
    if (!existing || existing.pageId !== pageId) {
      throw new Error("Version not found");
    }
    html = existing.html;
    bodyData = existing.visbuildData;
  } else {
    const versions = await ctx.repo.listPageVersions(pageId);
    const latestId = versions[0]?.versionId;
    const latest = latestId ? await ctx.repo.getPageVersion(latestId) : null;
    if (latest && visbuildDataEqual(latest.visbuildData, visbuildData)) {
      versionId = latest.versionId;
      html = latest.html;
      bodyData = latest.visbuildData;
    } else {
      html = convertToShopifyBody(visbuildData);
      bodyData = visbuildData;
      versionId = `${pageId}#${Date.now()}#publish`;
      await ctx.repo.appendPageVersion({
        versionId,
        pageId,
        visbuildData: bodyData,
        html,
        source: "publish",
        title: titleFromVisbuildData(bodyData),
        createdAt: now,
      });
    }
  }

  const gid = await pushPageToShopify(ctx, index, html);

  await ctx.repo.patchPageIndex(index, {
    shopifyPageGid: gid,
    status: "published",
    liveVersionId: versionId,
    evergreenVersionId: versionId,
    lastPublishedAt: now,
    updatedAt: now,
  });
  await ctx.repo.putPageBody({
    pageId,
    currentVisbuildData: bodyData,
    currentHtml: html,
  });

  const scheduled = await ctx.repo.getVersionSchedule(pageId, versionId);
  if (
    scheduled &&
    (scheduled.status === "pending" || scheduled.status === "failed")
  ) {
    await cancelVersionSchedule(ctx, pageId, versionId);
  } else {
    await refreshPageScheduleState(ctx, pageId, versionId);
  }
}

export async function unpublishPageNow(
  pageId: string,
  ctx: ServerContext,
): Promise<void> {
  const index = await ctx.repo.getPageIndex(pageId);
  if (!index) throw new Error("Page not found");

  await hidePageOnShopify(ctx, index);
  const now = new Date().toISOString();
  const schedules = await ctx.repo.listVersionSchedules(pageId);
  for (const schedule of schedules) {
    if (schedule.status !== "live") continue;
    schedule.status = "ended";
    schedule.unpublishedAt = now;
    schedule.updatedAt = now;
    await ctx.repo.putVersionSchedule(schedule);
  }

  await ctx.repo.patchPageIndex(index, {
    liveVersionId: null,
    evergreenVersionId: null,
    evergreenClearedAt: now,
    lastPublishedAt: index.lastPublishedAt ?? now,
    updatedAt: now,
  });
  await refreshPageScheduleState(ctx, pageId);
}

export async function savePageDraft(
  pageId: string,
  ctx: ServerContext,
  visbuildData: Data,
): Promise<string> {
  const versions = await ctx.repo.listPageVersions(pageId);
  const latestId = versions[0]?.versionId;
  if (latestId) {
    const latest = await ctx.repo.getPageVersion(latestId);
    if (latest && visbuildDataEqual(latest.visbuildData, visbuildData)) {
      return latestId;
    }
  }

  const html = convertToShopifyBody(visbuildData);
  const now = new Date().toISOString();
  const versionId = `${pageId}#${Date.now()}#save`;

  await ctx.repo.appendPageVersion({
    versionId,
    pageId,
    visbuildData,
    html,
    source: "manual_save",
    title: titleFromVisbuildData(visbuildData),
    createdAt: now,
  });

  await ctx.repo.putPageBody({
    pageId,
    currentVisbuildData: visbuildData,
    currentHtml: html,
  });
  await refreshPageScheduleState(ctx, pageId, versionId);
  return versionId;
}
