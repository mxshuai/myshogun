import { data } from "react-router";
import type { Data } from "@puckeditor/core";

import type { Route } from "./+types/shop.$shopDomain.splat";
import { resolveShopVisbuildPath } from "~/lib/resolve-visbuild-path.server";
import { ensureServerContext } from "~/lib/server/factory";
import {
  dataWithPagePath,
  getEditorPageMeta,
  getPageDataByPath,
  savePageByPath,
  setPublishedByPath,
} from "~/lib/server/page-service.server";
import { cancelVersionSchedule, scheduleVersion } from "~/lib/server/publish";
import { requireShopRouteContext } from "~/lib/server/shop-route.server";

function ensureEditorRootProps(pageData: Data, urlPath: string): Data {
  const props = { ...(pageData.root?.props as Record<string, unknown>) };
  const existing =
    typeof props.pagePath === "string" ? props.pagePath.trim() : "";
  if (!existing) props.pagePath = urlPath;
  return {
    ...pageData,
    root: { ...pageData.root, props },
  };
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const ctx = await ensureServerContext();
  const { shop } = await requireShopRouteContext(
    request,
    params.shopDomain ?? "",
    ctx,
  );
  const { isEditorRoute, path } = resolveShopVisbuildPath(request.url, shop.domain);
  const page = await getPageDataByPath(ctx, shop.id, path);
  const pageMeta = await getEditorPageMeta(ctx, shop.id, path);

  if (!page) {
    throw new Response("Not Found", { status: 404 });
  }

  const resolved = isEditorRoute ? ensureEditorRootProps(page, path) : page;
  const versions =
    isEditorRoute && pageMeta
      ? await ctx.repo.listPageVersions(pageMeta.pageId)
      : [];

  return {
    shopDomain: shop.domain,
    isEditorRoute,
    path,
    data: resolved,
    pageMeta,
    versions,
  };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  return [
    {
      title: loaderData.isEditorRoute
        ? `Edit: ${loaderData.path}`
        : loaderData.data.root.props?.title ?? "",
    },
  ];
}

type EditorActionBody =
  | { intent: "save"; data: Data }
  | { intent: "publish"; data: Data }
  | {
      intent: "schedule";
      data: Data;
      versionId: string | null;
      publishAt: string;
      unpublishAt: string | null;
      timezone: string;
    }
  | { intent: "unschedule"; data: Data; versionId: string };

function isRestoreRequest(
  raw: unknown,
): raw is { intent: "restore"; versionId: string } {
  if (!raw || typeof raw !== "object") return false;
  const body = raw as Record<string, unknown>;
  return body.intent === "restore" && typeof body.versionId === "string" && body.versionId.trim().length > 0;
}

function parseEditorBody(raw: unknown): EditorActionBody | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const intent = b.intent;
  const payload = b.data;
  if (
    intent !== "save" &&
    intent !== "publish" &&
    intent !== "schedule" &&
    intent !== "unschedule"
  ) {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  if (intent === "save" || intent === "publish") {
    return { intent, data: payload as Data };
  }
  if (intent === "unschedule") {
    const versionId = typeof b.versionId === "string" ? b.versionId.trim() : "";
    if (!versionId) return null;
    return { intent, data: payload as Data, versionId };
  }
  const publishAt = typeof b.publishAt === "string" ? b.publishAt : "";
  const unpublishAt =
    typeof b.unpublishAt === "string" && b.unpublishAt.trim()
      ? b.unpublishAt
      : null;
  const timezone = typeof b.timezone === "string" ? b.timezone : "UTC";
  const versionId =
    typeof b.versionId === "string" && b.versionId.trim() ? b.versionId.trim() : null;
  return { intent, data: payload as Data, versionId, publishAt, unpublishAt, timezone };
}

async function editorSnapshot(
  ctx: Awaited<ReturnType<typeof ensureServerContext>>,
  shopId: string,
  pagePath: string,
) {
  const pageMeta = await getEditorPageMeta(ctx, shopId, pagePath);
  const versions = pageMeta ? await ctx.repo.listPageVersions(pageMeta.pageId) : [];
  return { pageMeta, versions };
}

export async function action({ params, request }: Route.ActionArgs) {
  const ctx = await ensureServerContext();
  const { shop } = await requireShopRouteContext(
    request,
    params.shopDomain ?? "",
    ctx,
  );
  const { path } = resolveShopVisbuildPath(request.url, shop.domain);
  const raw = (await request.json()) as unknown;
  if (isRestoreRequest(raw)) {
    const meta = await getEditorPageMeta(ctx, shop.id, path);
    if (!meta) {
      return data({ ok: false as const, error: "Page not found" }, { status: 404 });
    }
    const version = await ctx.repo.getPageVersion(raw.versionId);
    if (!version || version.pageId !== meta.pageId) {
      return data(
        { ok: false as const, error: "Version not found" },
        { status: 404 },
      );
    }
    return data({
      ok: true as const,
      intent: "restore" as const,
      versionId: version.versionId,
      data: dataWithPagePath(version.visbuildData, path),
    });
  }

  const body = parseEditorBody(raw);

  const rootProps = body?.data?.root?.props as { pagePath?: string } | undefined;
  const desired =
    typeof rootProps?.pagePath === "string" ? rootProps.pagePath : path;

  if (!body) {
    return data({ ok: false as const, error: "Invalid request" }, { status: 400 });
  }

  if (body.intent === "save") {
    const result = await savePageByPath(ctx, shop.id, path, body.data, desired);
    if (!result.ok) {
      return data({ ok: false as const, error: result.error }, { status: 400 });
    }
    const snapshot = await editorSnapshot(ctx, shop.id, result.path);
    return data({
      ok: true as const,
      path: result.path,
      pageId: result.pageId,
      versionId: result.versionId,
      status: snapshot.pageMeta?.status ?? result.status,
      pageMeta: snapshot.pageMeta,
      versions: snapshot.versions,
      renamed: result.path !== path,
    });
  }

  const meta = await getEditorPageMeta(ctx, shop.id, path);
  if (!meta) {
    return data(
      { ok: false as const, error: "Page not found" },
      { status: 404 },
    );
  }

  try {
    if (body.intent === "publish") {
      const saved = await savePageByPath(ctx, shop.id, path, body.data, desired);
      if (!saved.ok) {
        return data({ ok: false as const, error: saved.error }, { status: 400 });
      }
      const result = await setPublishedByPath(ctx, shop.id, saved.path, {
        versionId: saved.versionId,
      });
      if (!result.ok) {
        return data({ ok: false as const, error: result.error }, { status: 400 });
      }
      const snapshot = await editorSnapshot(ctx, shop.id, result.path);
      return data({
        ok: true as const,
        path: result.path,
        versionId: saved.versionId ?? snapshot.versions[0]?.versionId,
        status: snapshot.pageMeta?.status ?? ("published" as const),
        pageMeta: snapshot.pageMeta,
        versions: snapshot.versions,
        renamed: saved.path !== path,
      });
    }

    if (body.intent === "schedule") {
      let versionId = body.versionId;
      let savedPath = path;
      if (!versionId) {
        const saved = await savePageByPath(ctx, shop.id, path, body.data, desired);
        if (!saved.ok) {
          return data({ ok: false as const, error: saved.error }, { status: 400 });
        }
        versionId = saved.versionId ?? null;
        savedPath = saved.path;
      }
      if (!versionId) {
        return data({ ok: false as const, error: "Version not found" }, { status: 400 });
      }
      const publishAt = new Date(body.publishAt);
      const unpublishAt = body.unpublishAt ? new Date(body.unpublishAt) : null;
      if (
        Number.isNaN(publishAt.getTime()) ||
        (unpublishAt && Number.isNaN(unpublishAt.getTime()))
      ) {
        return data(
          { ok: false as const, error: "Invalid schedule time" },
          { status: 400 },
        );
      }
      await scheduleVersion(ctx, {
        pageId: meta.pageId,
        versionId,
        publishAt,
        unpublishAt,
        timezone: body.timezone,
      });
      const snapshot = await editorSnapshot(ctx, shop.id, savedPath);
      return data({
        ok: true as const,
        path: savedPath,
        versionId,
        status: snapshot.pageMeta?.status ?? ("scheduled" as const),
        pageMeta: snapshot.pageMeta,
        versions: snapshot.versions,
        renamed: savedPath !== path,
      });
    }

    if (body.intent === "unschedule") {
      await cancelVersionSchedule(ctx, meta.pageId, body.versionId);
      const snapshot = await editorSnapshot(ctx, shop.id, path);
      return data({
        ok: true as const,
        path,
        pageId: meta.pageId,
        versionId: body.versionId,
        status: snapshot.pageMeta?.status ?? ("dirty" as const),
        pageMeta: snapshot.pageMeta,
        versions: snapshot.versions,
      });
    }
  } catch (e) {
    return data(
      {
        ok: false as const,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 400 },
    );
  }

  return data({ ok: false as const, error: "Unknown intent" }, { status: 400 });
}
