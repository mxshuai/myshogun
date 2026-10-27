import type { Data } from "@puckeditor/core";

import { canonicalPagePath, literalPagePath } from "../page-path";
import { validatePageHandleForShop } from "./handle-conflict.server";
import { newId, normalizeHandle } from "./page-ops";
import {
  cancelPendingJob,
  publishPageNow,
  savePageDraft,
  schedulePageUpdate,
} from "./publish";
import type { PageIndex, PageStatus, ServerContext } from "./types";

/** Shape consumed by the /pages list UI (mirrors the legacy file-based summary). */
export type ShopPageSummary = {
  path: string;
  title: string;
  displayPath: string;
  status: "draft" | "published" | "scheduled" | "outdated";
  updatedAt: string;
  scheduledPublishAt: string | null;
};

export type SaveResult =
  | { ok: true; path: string; pageId?: string; status?: PageStatus }
  | { ok: false; error: string };

export type EditorPageMeta = {
  pageId: string;
  status: PageStatus;
  scheduledPublishAt: string | null;
  pendingJobId: string | null;
};

export async function getEditorPageMeta(
  ctx: ServerContext,
  shopId: string,
  path: string,
): Promise<EditorPageMeta | null> {
  const idx = await findIndexByPath(ctx, shopId, path);
  if (!idx) return null;
  return {
    pageId: idx.pageId,
    status: idx.status,
    scheduledPublishAt: idx.scheduledPublishAt,
    pendingJobId: idx.pendingJobId,
  };
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

/** Map the 4-value index status onto the 3-value list status. */
function listStatus(status: PageStatus): ShopPageSummary["status"] {
  if (status === "published") return "published";
  if (status === "scheduled") return "scheduled";
  if (status === "dirty") return "outdated";
  return "draft";
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
  const rows: ShopPageSummary[] = pages.map((p) => ({
    path: p.pagePath,
    title: displayTitle(p.title, p.pagePath),
    displayPath: p.pagePath,
    status: listStatus(p.status),
    updatedAt: p.updatedAt,
    scheduledPublishAt: p.scheduledPublishAt,
  }));
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
    idx.pagePath = desired;
    idx.handle = handleFromPath(desired);
  }
  idx.title = title;
  idx.updatedAt = now;
  if (idx.status === "published") {
    idx.status = "dirty";
  }

  await ctx.repo.putPageIndex(idx);

  const versionId = await savePageDraft(
    idx.pageId,
    ctx,
    dataWithPagePath(data, desired),
  );

  if (idx.pendingJobId) {
    const job = await ctx.repo.getJob(idx.pendingJobId);
    if (job?.pageId === idx.pageId && job.status === "pending") {
      job.payloadVersionId = versionId;
      job.updatedAt = now;
      await ctx.repo.putJob(job);
    }
  }

  return { ok: true, path: desired, pageId: idx.pageId, status: idx.status };
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
    pendingJobId: null,
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

/** Cancel EventBridge / dev timer and mark job cancelled, then remove page records. */
export async function deletePageForShop(
  ctx: ServerContext,
  pageId: string,
): Promise<boolean> {
  const idx = await ctx.repo.getPageIndex(pageId);
  if (!idx) return false;
  await cancelPendingJob(pageId, ctx);
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
    pendingJobId: null,
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
): Promise<SaveResult> {
  const idx = await findIndexByPath(ctx, shopId, path);
  if (!idx) return { ok: false, error: "Page not found" };

  const body = await ctx.repo.getPageBody(idx.pageId);
  const data: Data =
    body?.currentVisbuildData ?? ({ content: [], root: { props: {} } } as Data);

  try {
    await publishPageNow(idx.pageId, ctx, data);
    return { ok: true, path };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Schedule a real Shopify publish for (shop, path): creates a PublishJob and an
 * EventBridge schedule via schedulePageUpdate. Previously this only flipped the
 * local status, so the scheduled time never actually pushed to Shopify.
 *
 * At run time, Publish Lambda creates the Shopify page if shopifyPageGid is missing.
 */
export async function unschedulePageByPath(
  ctx: ServerContext,
  shopId: string,
  path: string,
): Promise<SaveResult> {
  const idx = await findIndexByPath(ctx, shopId, path);
  if (!idx) return { ok: false, error: "Page not found" };
  await cancelPendingJob(idx.pageId, ctx);
  return { ok: true, path };
}

export async function setScheduledByPath(
  ctx: ServerContext,
  shopId: string,
  path: string,
  scheduledPublishAt: string,
  timezone = "UTC",
): Promise<SaveResult> {
  let idx = await findIndexByPath(ctx, shopId, path);
  if (!idx) return { ok: false, error: "Page not found" };

  if (idx.pendingJobId) {
    await cancelPendingJob(idx.pageId, ctx);
    idx = await findIndexByPath(ctx, shopId, path);
    if (!idx) return { ok: false, error: "Page not found" };
  }

  const runAt = new Date(scheduledPublishAt);
  if (Number.isNaN(runAt.getTime())) {
    return { ok: false, error: "Invalid schedule time" };
  }

  const body = await ctx.repo.getPageBody(idx.pageId);
  const data: Data =
    body?.currentVisbuildData ?? ({ content: [], root: { props: {} } } as Data);

  try {
    await schedulePageUpdate(idx.pageId, ctx, data, runAt, timezone);
    return { ok: true, path };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
