import type { Data } from "@puckeditor/core";

import { canonicalPagePath, literalPagePath } from "../page-path";
import { visbuildDataEqual } from "../visbuild-data-equal";
import { validatePageHandleForShop } from "./handle-conflict.server";
import { newId, normalizeHandle } from "./page-ops";
import type { ScheduleSummary, VersionDisplayStatus } from "../schedule-window";
import { versionDisplayStatus } from "../schedule-window";
import {
  cancelAllPageJobs,
  cancelAllPendingSchedulesForPage,
  cancelVersionSchedule,
  deleteShopifyPage,
  publishPageNow,
  savePageDraft,
  scheduleVersion,
  unpublishPageNow,
} from "./publish";
import type {
  PageIndex,
  PageIndexPatch,
  PageStatus,
  PageVersionSummary,
  ScheduleStatus,
  ServerContext,
} from "./types";

/** Shape consumed by the /pages list UI (mirrors the legacy file-based summary). */
export type ShopPageSummary = {
  path: string;
  title: string;
  displayPath: string;
  status: VersionDisplayStatus;
  updatedAt: string;
  scheduledPublishAt: string | null;
  latestVersion: {
    versionId: string;
    versionNumber: number;
    title: string;
    status: VersionDisplayStatus;
    at: string;
  } | null;
  schedules: ScheduleSummary[];
  canUnpublish: boolean;
};

export type SaveResult =
  | { ok: true; path: string; pageId?: string; status?: PageStatus; versionId?: string }
  | { ok: false; error: string };

export type EditorPageMeta = {
  pageId: string;
  status: PageStatus;
  scheduledPublishAt: string | null;
  liveVersionId: string | null;
  evergreenVersionId: string | null;
  schedules: ScheduleSummary[];
};

export async function getEditorPageMeta(
  ctx: ServerContext,
  shopId: string,
  path: string,
): Promise<EditorPageMeta | null> {
  const idx = await findIndexByPath(ctx, shopId, path);
  if (!idx) return null;
  const schedules = await scheduleSummaries(ctx, idx.pageId);
  return {
    pageId: idx.pageId,
    status: idx.status,
    scheduledPublishAt: idx.scheduledPublishAt,
    liveVersionId: idx.liveVersionId,
    evergreenVersionId: idx.evergreenVersionId,
    schedules,
  };
}

async function scheduleSummaries(
  ctx: ServerContext,
  pageId: string,
  knownVersions?: PageVersionSummary[],
): Promise<ScheduleSummary[]> {
  const [versions, schedules] = await Promise.all([
    knownVersions ? Promise.resolve(knownVersions) : ctx.repo.listPageVersions(pageId),
    ctx.repo.listVersionSchedules(pageId),
  ]);
  const numberById = new Map(versions.map((version) => [version.versionId, version.versionNumber]));
  const titleById = new Map(versions.map((version) => [version.versionId, version.title]));
  return schedules
    .filter((schedule) => schedule.status !== "cancelled")
    .map((schedule) => ({
      versionId: schedule.versionId,
      versionNumber: numberById.get(schedule.versionId) ?? 0,
      title: titleById.get(schedule.versionId) ?? "Untitled",
      publishAt: schedule.publishAt,
      unpublishAt: schedule.unpublishAt,
      unpublishedAt: schedule.unpublishedAt,
      status: schedule.status,
      lastError: schedule.lastError,
      updatedAt: schedule.updatedAt,
    }))
    .sort((a, b) => (a.publishAt < b.publishAt ? -1 : a.publishAt > b.publishAt ? 1 : 0));
}

/** Leading /, no .. or //, no trailing slash (except root). Does not slug. */
export function normalizePagePath(raw: string): string | null {
  return literalPagePath(raw);
}

function handleFromPath(path: string): string {
  if (path === "/") return "home";
  return normalizeHandle(path) || "page";
}

function displayTitle(rawTitle: string, path: string): string {
  const t = rawTitle.trim();
  if (t) return t;
  return path === "/" ? "Home" : path.replace(/^\//, "") || "Untitled";
}

function titleFromData(data: Data, path: string): string {
  const raw = (data.root?.props as { title?: string } | undefined)?.title ?? "";
  return displayTitle(raw, path);
}

function laterIso(a: string, b: string | null | undefined): string {
  if (!b) return a;
  return a > b ? a : b;
}

async function findIndexByPath(
  ctx: ServerContext,
  shopId: string,
  path: string,
): Promise<PageIndex | null> {
  const pages = await ctx.repo.listPagesByShop(shopId);
  return pages.find((p) => p.pagePath === path) ?? null;
}

export async function listPagesForShop(
  ctx: ServerContext,
  shopId: string,
): Promise<ShopPageSummary[]> {
  const pages = await ctx.repo.listPagesByShop(shopId);
  const rows: ShopPageSummary[] = await Promise.all(
    pages.map(async (p) => {
      const versions = await ctx.repo.listPageVersions(p.pageId);
      const scheduleRows = await scheduleSummaries(ctx, p.pageId, versions);
      const latest = versions[0] ?? null;
      const latestSchedule = latest
        ? scheduleRows.find((schedule) => schedule.versionId === latest.versionId) ?? null
        : null;
      const visible = Boolean(p.liveVersionId);
      const status: VersionDisplayStatus = latest
        ? versionDisplayStatus({
            source: latest.source,
            scheduleStatus: (latestSchedule?.status ?? null) as ScheduleStatus | null,
            isLive: p.liveVersionId === latest.versionId,
            pageHasPublishHistory: Boolean(p.lastPublishedAt || p.liveVersionId),
            pageIsVisible: visible,
          })
        : "draft";
      const at = latest
        ? laterIso(latest.createdAt, latestSchedule?.updatedAt)
        : p.updatedAt;
      return {
        path: p.pagePath,
        title: displayTitle(p.title, p.pagePath),
        displayPath: p.pagePath,
        status,
        updatedAt: at,
        scheduledPublishAt: p.scheduledPublishAt,
        latestVersion: latest
          ? {
              versionId: latest.versionId,
              versionNumber: latest.versionNumber,
              title: latest.title,
              status,
              at,
            }
          : null,
        schedules: scheduleRows,
        canUnpublish: Boolean(p.shopifyPageGid && p.liveVersionId),
      };
    }),
  );
  rows.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return rows;
}

export async function getPageDataByPath(
  ctx: ServerContext,
  shopId: string,
  path: string,
): Promise<Data | undefined> {
  const idx = await findIndexByPath(ctx, shopId, path);
  if (!idx) return undefined;
  const body = await ctx.repo.getPageBody(idx.pageId);
  return body?.currentVisbuildData;
}

function resolveDesiredPath(
  currentPath: string,
  desiredPathRaw: string,
): { ok: true; path: string } | { ok: false; error: string } {
  const literal = literalPagePath(desiredPathRaw);
  if (!literal) return { ok: false, error: "Invalid URL path" };
  if (literal === currentPath) return { ok: true, path: currentPath };
  if (literal === "/") {
    return { ok: false, error: "Path / is reserved for the home page" };
  }
  const desired = canonicalPagePath(desiredPathRaw);
  if (!desired) return { ok: false, error: "Invalid URL path" };
  return { ok: true, path: desired };
}

export function dataWithPagePath(data: Data, pagePath: string): Data {
  const props = {
    ...(data.root?.props as object),
    pagePath,
  } as Data["root"]["props"];
  return { ...data, root: { ...data.root, props } };
}

/**
 * Save editor content for an existing (shop, path). Renames only when the
 * submitted URL path is a different page path; a title-only save keeps the
 * stored path, including legacy paths that contain spaces.
 */
export async function savePageByPath(
  ctx: ServerContext,
  shopId: string,
  currentPath: string,
  data: Data,
  desiredPathRaw: string,
): Promise<SaveResult> {
  const idx = await findIndexByPath(ctx, shopId, currentPath);
  if (!idx) return { ok: false, error: "Page not found" };

  const resolved = resolveDesiredPath(currentPath, desiredPathRaw);
  if (!resolved.ok) return resolved;
  const desired = resolved.path;
  const now = new Date().toISOString();
  const title = titleFromData(data, desired);

  if (currentPath === "/" && desired !== "/") {
    return { ok: false, error: "Home page path cannot be changed" };
  }
  if (desired === "/" && currentPath !== "/") {
    return { ok: false, error: "Path / is reserved for the home page" };
  }

  const patch: PageIndexPatch = { title, updatedAt: now };
  if (desired !== currentPath) {
    const conflict = await findIndexByPath(ctx, shopId, desired);
    if (conflict && conflict.pageId !== idx.pageId) {
      return { ok: false, error: "A page with this path already exists" };
    }
    const handleCheck = await validatePageHandleForShop(ctx, shopId, desired, {
      excludePageId: idx.pageId,
      excludeShopifyGid: idx.shopifyPageGid,
    });
    if (!handleCheck.ok) {
      return { ok: false, error: handleCheck.error };
    }
    patch.pagePath = desired;
    patch.handle = handleFromPath(desired);
  }
  await ctx.repo.patchPageIndex(idx, patch);

  const draftData = dataWithPagePath(data, desired);
  const versions = await ctx.repo.listPageVersions(idx.pageId);
  const latestId = versions[0]?.versionId;
  let versionId: string;
  if (latestId) {
    const latest = await ctx.repo.getPageVersion(latestId);
    if (latest && visbuildDataEqual(latest.visbuildData, draftData)) {
      versionId = latestId;
      await ctx.repo.putPageBody({
        pageId: idx.pageId,
        currentVisbuildData: latest.visbuildData,
        currentHtml: latest.html,
      });
    } else {
      versionId = await savePageDraft(idx.pageId, ctx, draftData);
    }
  } else {
    versionId = await savePageDraft(idx.pageId, ctx, draftData);
  }
  const updated = await ctx.repo.getPageIndex(idx.pageId);

  return {
    ok: true,
    path: desired,
    pageId: idx.pageId,
    status: updated?.status ?? idx.status,
    versionId,
  };
}

export async function createPageForShop(
  ctx: ServerContext,
  shopId: string,
  pathRaw: string,
  titleRaw: string,
): Promise<SaveResult> {
  if (literalPagePath(pathRaw) === "/") {
    return { ok: false, error: "Path / is reserved for the home page" };
  }
  const path = canonicalPagePath(pathRaw);
  if (!path) return { ok: false, error: "Invalid URL path" };
  const existing = await findIndexByPath(ctx, shopId, path);
  if (existing) {
    return { ok: false, error: "A page with this path already exists" };
  }

  const handleCheck = await validatePageHandleForShop(ctx, shopId, path);
  if (!handleCheck.ok) {
    return { ok: false, error: handleCheck.error };
  }

  const now = new Date().toISOString();
  const title = titleRaw.trim() || "Untitled";
  const rootProps = { title, pagePath: path };
  const data: Data = {
    content: [],
    root: { props: rootProps },
  };
  const idx: PageIndex = {
    pageId: newId(),
    shopId,
    handle: handleFromPath(path),
    title,
    status: "draft",
    shopifyPageGid: null,
    lastPublishedAt: null,
    liveVersionId: null,
    evergreenVersionId: null,
    evergreenClearedAt: null,
    pagePath: path,
    updatedAt: now,
    scheduledPublishAt: null,
  };
  await ctx.repo.putPageIndex(idx);
  await ctx.repo.putPageBody({
    pageId: idx.pageId,
    currentVisbuildData: data,
    currentHtml: null,
  });
  return { ok: true, path };
}

/** Cancel pending jobs, delete the Shopify page, then remove local records. */
export async function deletePageForShop(
  ctx: ServerContext,
  pageId: string,
): Promise<boolean> {
  const idx = await ctx.repo.getPageIndex(pageId);
  if (!idx) return false;
  await deleteShopifyPage(ctx, idx);
  await cancelAllPageJobs(ctx, pageId);
  await ctx.repo.deletePage(pageId);
  return true;
}

export async function deletePageByPath(
  ctx: ServerContext,
  shopId: string,
  path: string,
): Promise<boolean> {
  const idx = await findIndexByPath(ctx, shopId, path);
  if (!idx) return false;
  return deletePageForShop(ctx, idx.pageId);
}

function nextDuplicatePath(path: string, existing: Set<string>): string {
  const trimmed = path.replace(/\/$/, "") || "/";
  let candidate = trimmed === "/" ? "/home-copy" : `${trimmed}-copy`;
  while (existing.has(candidate)) candidate = `${candidate}-copy`;
  return candidate;
}

export async function duplicatePageByPath(
  ctx: ServerContext,
  shopId: string,
  path: string,
): Promise<string | null> {
  const idx = await findIndexByPath(ctx, shopId, path);
  if (!idx) return null;
  const body = await ctx.repo.getPageBody(idx.pageId);
  const source: Data =
    body?.currentVisbuildData ?? ({ content: [], root: { props: {} } } as Data);

  const pages = await ctx.repo.listPagesByShop(shopId);
  const existing = new Set(pages.map((p) => p.pagePath));
  let newPath = nextDuplicatePath(path, existing);
  const canonicalCopy = canonicalPagePath(newPath);
  if (canonicalCopy && canonicalCopy !== newPath) {
    newPath = canonicalCopy;
    while (existing.has(newPath)) newPath = `${newPath}-copy`;
  }

  const clone = structuredClone(source) as Data;
  const sourceTitle = displayTitle(
    (clone.root?.props as { title?: string } | undefined)?.title ?? "",
    path,
  );
  const title = `Copy of ${sourceTitle}`;
  const cloneProps = {
    ...(clone.root?.props as object),
    title,
    pagePath: newPath,
  };
  clone.root = {
    ...clone.root,
    props: cloneProps,
  };

  const now = new Date().toISOString();
  const newIndex: PageIndex = {
    pageId: newId(),
    shopId,
    handle: handleFromPath(newPath),
    title,
    status: "draft",
    shopifyPageGid: null,
    lastPublishedAt: null,
    liveVersionId: null,
    evergreenVersionId: null,
    evergreenClearedAt: null,
    pagePath: newPath,
    updatedAt: now,
    scheduledPublishAt: null,
  };
  await ctx.repo.putPageIndex(newIndex);
  await ctx.repo.putPageBody({
    pageId: newIndex.pageId,
    currentVisbuildData: clone,
    currentHtml: null,
  });
  return newPath;
}

/**
 * Publish a page to Shopify (pageCreate on first publish, pageUpdate after) and
 * mark it published locally. Previously this only flipped the local status,
 * which is why published pages never showed up in the Shopify admin.
 */
export async function setPublishedByPath(
  ctx: ServerContext,
  shopId: string,
  path: string,
  options?: { versionId?: string },
): Promise<SaveResult> {
  const idx = await findIndexByPath(ctx, shopId, path);
  if (!idx) return { ok: false, error: "Page not found" };

  const body = await ctx.repo.getPageBody(idx.pageId);
  const data: Data =
    body?.currentVisbuildData ?? ({ content: [], root: { props: {} } } as Data);

  try {
    await publishPageNow(idx.pageId, ctx, data, {
      versionId: options?.versionId,
    });
    const versions = await ctx.repo.listPageVersions(idx.pageId);
    return { ok: true, path, versionId: versions[0]?.versionId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function unscheduleVersionByPath(
  ctx: ServerContext,
  shopId: string,
  path: string,
  versionId: string,
): Promise<SaveResult> {
  const idx = await findIndexByPath(ctx, shopId, path);
  if (!idx) return { ok: false, error: "Page not found" };
  await cancelVersionSchedule(ctx, idx.pageId, versionId);
  return { ok: true, path };
}

export async function scheduleVersionByPath(
  ctx: ServerContext,
  shopId: string,
  path: string,
  input: {
    versionId?: string | null;
    publishAt: Date;
    unpublishAt: Date | null;
    timezone: string;
  },
): Promise<SaveResult> {
  const idx = await findIndexByPath(ctx, shopId, path);
  if (!idx) return { ok: false, error: "Page not found" };

  let versionId = input.versionId?.trim() || "";
  if (!versionId) {
    const body = await ctx.repo.getPageBody(idx.pageId);
    const data: Data =
      body?.currentVisbuildData ?? ({ content: [], root: { props: {} } } as Data);
    versionId = await savePageDraft(idx.pageId, ctx, data);
  }

  try {
    await scheduleVersion(ctx, {
      pageId: idx.pageId,
      versionId,
      publishAt: input.publishAt,
      unpublishAt: input.unpublishAt,
      timezone: input.timezone,
    });
    return { ok: true, path, versionId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function unpublishPageByPath(
  ctx: ServerContext,
  shopId: string,
  path: string,
  options?: { cancelPendingSchedules?: boolean },
): Promise<SaveResult> {
  const idx = await findIndexByPath(ctx, shopId, path);
  if (!idx) return { ok: false, error: "Page not found" };
  try {
    if (options?.cancelPendingSchedules) {
      await cancelAllPendingSchedulesForPage(ctx, idx.pageId);
    }
    await unpublishPageNow(idx.pageId, ctx);
    return { ok: true, path };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
