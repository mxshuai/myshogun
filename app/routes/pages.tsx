import { data } from "react-router";

import type { Route } from "./+types/pages";
import { PagesList } from "~/components/pages/PagesList";
import {
  createPage,
  deletePage,
  duplicatePage,
  listShogunPageSummaries,
} from "~/lib/pages.server";
import {
  setPagePublished,
  setPageScheduled,
} from "~/lib/page-metadata.server";
import {
  listShopifyPages,
  markShopifyPageImported,
} from "~/lib/shopify-pages.server";
import { formatRelativeTime } from "~/lib/relative-time";

function normalizePagePath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  if (value.includes("..")) return null;
  return value;
}

/** 允许用户输入带或不带前导 / */
function normalizePathInput(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (!s.startsWith("/")) s = `/${s}`;
  if (s.includes("..") || s.includes("//")) return null;
  return s;
}

export async function loader(_args: Route.LoaderArgs) {
  const shogun = await listShogunPageSummaries();
  const shopify = await listShopifyPages();
  return {
    shogunPages: shogun.map((row) => ({
      ...row,
      editedRelative: formatRelativeTime(row.updatedAt),
    })),
    shopifyPages: shopify,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "publish") {
    const pagePath = normalizePagePath(form.get("pagePath"));
    if (!pagePath) {
      return data({ ok: false as const, error: "Invalid path" }, { status: 400 });
    }
    await setPagePublished(pagePath);
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
    for (const p of paths) {
      const pagePath = typeof p === "string" ? normalizePagePath(p) : null;
      if (pagePath) await setPagePublished(pagePath);
    }
    return data({ ok: true as const });
  }

  if (intent === "schedule") {
    const pagePath = normalizePagePath(form.get("pagePath"));
    const at = form.get("scheduledAt");
    if (!pagePath || typeof at !== "string" || !at.trim()) {
      return data({ ok: false as const, error: "Invalid input" }, { status: 400 });
    }
    const scheduledPublishAt = new Date(at).toISOString();
    if (Number.isNaN(Date.parse(scheduledPublishAt))) {
      return data({ ok: false as const, error: "Invalid date" }, { status: 400 });
    }
    await setPageScheduled(pagePath, scheduledPublishAt);
    return data({ ok: true as const });
  }

  if (intent === "duplicate") {
    const pagePath = normalizePagePath(form.get("pagePath"));
    if (!pagePath) {
      return data({ ok: false as const, error: "Invalid path" }, { status: 400 });
    }
    const newPath = await duplicatePage(pagePath);
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
    const removed = await deletePage(pagePath);
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
    const result = await createPage(
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
    const ok = await markShopifyPageImported(id.trim());
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

export default function PagesRoute({ loaderData }: Route.ComponentProps) {
  return (
    <PagesList
      shogunPages={loaderData.shogunPages}
      shopifyPages={loaderData.shopifyPages}
    />
  );
}
