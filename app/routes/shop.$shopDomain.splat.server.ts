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
import { cancelPendingJob, schedulePageUpdate } from "~/lib/server/publish";
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

  return {
    shopDomain: shop.domain,
    isEditorRoute,
    path,
    data: resolved,
    pageMeta,
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
      runAt: string;
      timezone: string;
    }
  | {
      intent: "reschedule";
      data: Data;
      runAt: string;
      timezone: string;
    }
  | { intent: "unschedule"; data: Data };

function parseEditorBody(raw: unknown): EditorActionBody | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const intent = b.intent;
  const payload = b.data;
  if (
    intent !== "save" &&
    intent !== "publish" &&
    intent !== "schedule" &&
    intent !== "reschedule" &&
    intent !== "unschedule"
  ) {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  if (intent === "save" || intent === "publish" || intent === "unschedule") {
    return { intent, data: payload as Data };
  }
  const runAt = typeof b.runAt === "string" ? b.runAt : "";
  const timezone = typeof b.timezone === "string" ? b.timezone : "UTC";
  return { intent, data: payload as Data, runAt, timezone };
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
    return data({
      ok: true as const,
      path: result.path,
      pageId: result.pageId,
      status: result.status,
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
      const result = await setPublishedByPath(ctx, shop.id, saved.path);
      if (!result.ok) {
        return data({ ok: false as const, error: result.error }, { status: 400 });
      }
      return data({
        ok: true as const,
        path: result.path,
        status: "published" as const,
        renamed: saved.path !== path,
      });
    }

    const runAt = new Date((body as { runAt?: string }).runAt as string);
    if (Number.isNaN(runAt.getTime())) {
      return data(
        { ok: false as const, error: "Invalid schedule time" },
        { status: 400 },
      );
    }

    if (body.intent === "schedule") {
      const saved = await savePageByPath(ctx, shop.id, path, body.data, desired);
      if (!saved.ok) {
        return data({ ok: false as const, error: saved.error }, { status: 400 });
      }
      const jobId = await schedulePageUpdate(
        meta.pageId,
        ctx,
        dataWithPagePath(body.data, saved.path),
        runAt,
        body.timezone,
      );
      return data({
        ok: true as const,
        path: saved.path,
        status: "scheduled" as const,
        jobId,
        runAt: runAt.toISOString(),
        renamed: saved.path !== path,
      });
    }

    if (body.intent === "reschedule") {
      const saved = await savePageByPath(ctx, shop.id, path, body.data, desired);
      if (!saved.ok) {
        return data({ ok: false as const, error: saved.error }, { status: 400 });
      }
      await cancelPendingJob(meta.pageId, ctx);
      const jobId = await schedulePageUpdate(
        meta.pageId,
        ctx,
        dataWithPagePath(body.data, saved.path),
        runAt,
        body.timezone,
      );
      return data({
        ok: true as const,
        path: saved.path,
        status: "scheduled" as const,
        jobId,
        runAt: runAt.toISOString(),
        renamed: saved.path !== path,
      });
    }

    if (body.intent === "unschedule") {
      const saved = await savePageByPath(ctx, shop.id, path, body.data, desired);
      if (!saved.ok) {
        return data({ ok: false as const, error: saved.error }, { status: 400 });
      }
      await cancelPendingJob(meta.pageId, ctx);
      const updated = await getEditorPageMeta(ctx, shop.id, saved.path);
      return data({
        ok: true as const,
        path: saved.path,
        pageId: meta.pageId,
        status: updated?.status ?? ("dirty" as const),
        renamed: saved.path !== path,
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
