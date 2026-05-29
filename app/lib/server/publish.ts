import type { Data } from "@puckeditor/core";

import { convertToShopifyBody } from "~/lib/convert-to-shopify-body";
import { createAdminClient } from "./shopify";
import type { PageVersion, PublishJob, ServerContext } from "./types";

const MAX_ATTEMPTS = 5;

function backoffMs(attempts: number): number {
  return Math.min(60_000, 2 ** attempts * 1000);
}

export async function publishPageVersion(
  jobId: string,
  ctx: ServerContext
): Promise<void> {
  const { repo, secrets } = ctx;
  const job = await repo.getJob(jobId);
  if (!job) return;
  if (job.status === "cancelled" || job.status === "done") return;

  const now = new Date().toISOString();
  job.status = "running";
  job.updatedAt = now;
  await repo.putJob(job);

  try {
    const version = await repo.getPageVersion(job.payloadVersionId);
    if (!version) throw new Error("Version snapshot not found");

    const index = await repo.getPageIndex(job.pageId);
    if (!index) throw new Error("Page not found");

    const shop = await repo.getShop(job.shopId);
    if (!shop) throw new Error("Shop not found");

    const token = await secrets.getShopToken(shop.id);
    if (!token) throw new Error("Shop access token not configured");

    const client = createAdminClient({
      shopDomain: shop.domain,
      accessToken: token,
    });

    if (!index.shopifyPageGid) {
      throw new Error("Page is not linked to Shopify");
    }

    await client.pageUpdate({
      id: index.shopifyPageGid,
      title: index.title,
      handle: index.handle,
      body: version.html,
      isPublished: true,
    });

    const publishedAt = new Date().toISOString();
    index.status = "published";
    index.lastPublishedAt = publishedAt;
    index.pendingJobId = null;
    await repo.putPageIndex(index);

    const body = await repo.getPageBody(job.pageId);
    if (body) {
      body.currentHtml = version.html;
      await repo.putPageBody(body);
    }

    await repo.appendPageVersion({
      versionId: `${job.pageId}#${Date.now()}#scheduled`,
      pageId: job.pageId,
      visbuildData: version.visbuildData,
      html: version.html,
      source: "scheduled_publish",
      createdAt: publishedAt,
    });

    job.status = "done";
    job.lastError = null;
    job.updatedAt = publishedAt;
    await repo.putJob(job);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    job.attempts += 1;
    job.lastError = message;
    job.updatedAt = new Date().toISOString();

    if (job.attempts >= (job.maxAttempts ?? MAX_ATTEMPTS)) {
      job.status = "failed";
      await repo.putJob(job);
      const index = await repo.getPageIndex(job.pageId);
      if (index && index.pendingJobId === job.jobId) {
        index.pendingJobId = null;
        if (index.status === "scheduled") index.status = "dirty";
        await repo.putPageIndex(index);
      }
      return;
    }

    job.status = "pending";
    await repo.putJob(job);

    const retryAt = new Date(Date.now() + backoffMs(job.attempts));
    if (retryAt <= new Date(job.runAt)) {
      job.runAt = retryAt.toISOString();
      await repo.putJob(job);
    }
    await ctx.scheduler.scheduleAt({ jobId: job.jobId, runAt: retryAt });
  }
}

export async function publishPageNow(
  pageId: string,
  ctx: ServerContext,
  visbuildData: Data
): Promise<void> {
  const { repo, secrets } = ctx;
  const index = await repo.getPageIndex(pageId);
  if (!index) throw new Error("Page not found");

  const shop = await repo.getShop(index.shopId);
  if (!shop) throw new Error("Shop not found");

  const token = await secrets.getShopToken(shop.id);
  if (!token) throw new Error("Shop access token not configured");

  const html = convertToShopifyBody(visbuildData);
  const client = createAdminClient({
    shopDomain: shop.domain,
    accessToken: token,
  });

  let gid = index.shopifyPageGid;
  if (!gid) {
    const created = await client.pageCreate({
      title: index.title,
      handle: index.handle,
      body: html,
      isPublished: true,
    });
    gid = created.id;
    index.shopifyPageGid = gid;
  } else {
    await client.pageUpdate({
      id: gid,
      title: index.title,
      handle: index.handle,
      body: html,
      isPublished: true,
    });
  }

  const now = new Date().toISOString();
  const versionId = `${pageId}#${Date.now()}#publish`;

  await repo.appendPageVersion({
    versionId,
    pageId,
    visbuildData,
    html,
    source: "publish",
    createdAt: now,
  });

  index.status = "published";
  index.lastPublishedAt = now;
  index.updatedAt = now;
  index.scheduledPublishAt = null;
  index.pendingJobId = null;
  await repo.putPageIndex(index);

  await repo.putPageBody({
    pageId,
    currentVisbuildData: visbuildData,
    currentHtml: html,
  });
}

export async function savePageDraft(
  pageId: string,
  ctx: ServerContext,
  visbuildData: Data
): Promise<string> {
  const html = convertToShopifyBody(visbuildData);
  const now = new Date().toISOString();
  const versionId = `${pageId}#${Date.now()}#save`;

  await ctx.repo.appendPageVersion({
    versionId,
    pageId,
    visbuildData,
    html,
    source: "manual_save",
    createdAt: now,
  });

  await ctx.repo.putPageBody({
    pageId,
    currentVisbuildData: visbuildData,
    currentHtml: html,
  });

  const index = await ctx.repo.getPageIndex(pageId);
  if (index && index.status !== "scheduled") {
    index.status = "dirty";
    await ctx.repo.putPageIndex(index);
  }

  return versionId;
}

export async function schedulePageUpdate(
  pageId: string,
  ctx: ServerContext,
  visbuildData: Data,
  runAt: Date,
  timezone: string
): Promise<string> {
  const index = await ctx.repo.getPageIndex(pageId);
  if (!index) throw new Error("Page not found");
  if (!index.shopifyPageGid) {
    throw new Error("Publish to Shopify once before scheduling an update");
  }

  const versionId = await savePageDraft(pageId, ctx, visbuildData);
  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();

  const job: PublishJob = {
    jobId,
    pageId,
    shopId: index.shopId,
    payloadVersionId: versionId,
    runAt: runAt.toISOString(),
    timezone,
    status: "pending",
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };

  await ctx.repo.putJob(job);
  await ctx.scheduler.scheduleAt({ jobId, runAt });

  index.status = "scheduled";
  index.pendingJobId = jobId;
  index.scheduledPublishAt = runAt.toISOString();
  index.updatedAt = now;
  await ctx.repo.putPageIndex(index);

  return jobId;
}

export async function cancelPendingJob(
  pageId: string,
  ctx: ServerContext
): Promise<void> {
  const index = await ctx.repo.getPageIndex(pageId);
  if (!index?.pendingJobId) return;

  await ctx.repo.cancelJob(index.pendingJobId);
  await ctx.scheduler.cancel(index.pendingJobId);

  index.pendingJobId = null;
  if (index.status === "scheduled") index.status = "dirty";
  await ctx.repo.putPageIndex(index);
}
