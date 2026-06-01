import { data } from "react-router";

import type { Route } from "./+types/shop.$shopDomain.pages";
import { PagesList } from "~/components/pages/PagesList";
import { shopPagesPath } from "~/lib/shop-url";
import { ensureServerContext } from "~/lib/server/factory";
import {
  createPageForShop,
  deletePageByPath,
  duplicatePageByPath,
  listPagesForShop,
  setPublishedByPath,
  setScheduledByPath,
} from "~/lib/server/page-service.server";
import { requireShopRouteContext } from "~/lib/server/shop-route.server";
import {
  importShopifyPageForShop,
  listShopifyPagesForShop,
} from "~/lib/shopify-pages.server";
import { formatRelativeTime } from "~/lib/relative-time";

function normalizePagePath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  if (value.includes("..")) return null;
  return value;
}

function normalizePathInput(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (!s.startsWith("/")) s = `/${s}`;
  if (s.includes("..") || s.includes("//")) return null;
  return s;
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const ctx = await ensureServerContext();
  const { shop } = await requireShopRouteContext(
    request,
    params.shopDomain ?? "",
    ctx,
  );
  const shogun = await listPagesForShop(ctx, shop.id);
  const shopify = await listShopifyPagesForShop(ctx, shop.id);
  return {
    shopDomain: shop.domain,
    pagesAction: shopPagesPath(shop.domain),
    shogunPages: shogun.map((row) => ({
      ...row,
      editedRelative: formatRelativeTime(row.updatedAt),
    })),
    shopifyPages: shopify,
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const ctx = await ensureServerContext();
  const { shop } = await requireShopRouteContext(
    request,
    params.shopDomain ?? "",
    ctx,
  );
  const shopId = shop.id;
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "publish") {
    const pagePath = normalizePagePath(form.get("pagePath"));
    if (!pagePath) {
      return data({ ok: false as const, error: "Invalid path" }, { status: 400 });
    }
    const result = await setPublishedByPath(ctx, shopId, pagePath);
    if (!result.ok) {
      return data({ ok: false as const, error: result.error }, { status: 400 });
    }
    return data({ ok: true as const });
  }

  if (intent === "bulkPublish") {
    const raw = form.get("paths");
    if (typeof raw !== "string") {
      return data({ ok: false as const, error: "Missing paths" }, { status: 400 });
    }
    let paths: unknown;
    try {
      paths = JSON.parse(raw);
    } catch {
      return data({ ok: false as const, error: "Invalid paths" }, { status: 400 });
    }
    if (!Array.isArray(paths)) {
      return data({ ok: false as const, error: "Invalid paths" }, { status: 400 });
    }
    const errors: string[] = [];
    for (const p of paths) {
      const pagePath = typeof p === "string" ? normalizePagePath(p) : null;
      if (!pagePath) continue;
      const result = await setPublishedByPath(ctx, shopId, pagePath);
      if (!result.ok) errors.push(`${pagePath}: ${result.error}`);
    }
    if (errors.length > 0) {
      return data(
        { ok: false as const, error: errors.join("; ") },
        { status: 400 },
      );
    }
    return data({ ok: true as const });
  }

  if (intent === "schedule") {
    const pagePath = normalizePagePath(form.get("pagePath"));
    const at = form.get("scheduledAt");
    if (!pagePath || typeof at !== "string" || !at.trim()) {
      return data({ ok: false as const, error: "Invalid input" }, { status: 400 });
    }
    const parsed = new Date(at);
    if (Number.isNaN(parsed.getTime())) {
      return data({ ok: false as const, error: "Invalid date" }, { status: 400 });
    }
    if (parsed.getTime() < Date.now() + 60_000) {
      return data(
        { ok: false as const, error: "Schedule time must be at least 1 minute in the future" },
        { status: 400 },
      );
    }
    const tzRaw = form.get("timezone");
    const timezone = typeof tzRaw === "string" && tzRaw.trim() ? tzRaw : "UTC";
    const result = await setScheduledByPath(
      ctx,
      shopId,
      pagePath,
      parsed.toISOString(),
      timezone,
    );
    if (!result.ok) {
      return data({ ok: false as const, error: result.error }, { status: 400 });
    }
    return data({ ok: true as const });
  }

  if (intent === "duplicate") {
    const pagePath = normalizePagePath(form.get("pagePath"));
    if (!pagePath) {
      return data({ ok: false as const, error: "Invalid path" }, { status: 400 });
    }
    const newPath = await duplicatePageByPath(ctx, shopId, pagePath);
    if (!newPath) {
      return data({ ok: false as const, error: "Not found" }, { status: 404 });
    }
    return data({ ok: true as const });
  }

  if (intent === "delete") {
    const pagePath = normalizePagePath(form.get("pagePath"));
    if (!pagePath) {
      return data({ ok: false as const, error: "Invalid path" }, { status: 400 });
    }
    const removed = await deletePageByPath(ctx, shopId, pagePath);
    if (!removed) {
      return data({ ok: false as const, error: "Not found" }, { status: 404 });
    }
    return data({ ok: true as const });
  }

  if (intent === "createPage") {
    const title = form.get("pageTitle");
    const rawPath = form.get("pagePath");
    const pagePath =
      typeof rawPath === "string" ? normalizePathInput(rawPath) : null;
    if (!pagePath) {
      return data({ ok: false as const, error: "Invalid URL path" }, { status: 400 });
    }
    const result = await createPageForShop(
      ctx,
      shopId,
      pagePath,
      typeof title === "string" ? title : ""
    );
    if (!result.ok) {
      return data({ ok: false as const, error: result.error }, { status: 409 });
    }
    return data({ ok: true as const, newPath: result.path });
  }

  if (intent === "importShopify") {
    const id = form.get("shopifyId");
    if (typeof id !== "string" || !id.trim()) {
      return data({ ok: false as const, error: "Missing id" }, { status: 400 });
    }
    const ok = await importShopifyPageForShop(ctx, shopId, id.trim());
    if (!ok) {
      return data({ ok: false as const, error: "Unknown page" }, { status: 404 });
    }
    return data({ ok: true as const });
  }

  return data({ ok: false as const, error: "Unknown intent" }, { status: 400 });
}

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Pages" }];
}

export default function ShopPagesRoute({ loaderData }: Route.ComponentProps) {
  return (
    <PagesList
      shopDomain={loaderData.shopDomain}
      pagesAction={loaderData.pagesAction}
      shogunPages={loaderData.shogunPages}
      shopifyPages={loaderData.shopifyPages}
    />
  );
}
