import { data } from "react-router";

import type { Route } from "./+types/api.shopify.webhook";
import { ensureServerContext } from "~/lib/server/factory";
import { visbuildDataFromShopifyBody } from "~/lib/server/page-ops";
import { savePageDraft } from "~/lib/server/publish";

/** Optional: Shopify pages/update webhook — mark linked pages dirty */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET?.trim();
  if (secret) {
    const hmac = request.headers.get("X-Shopify-Hmac-Sha256");
    if (!hmac) return data({ error: "Unauthorized" }, { status: 401 });
    // Full HMAC verify requires raw body; production should use dedicated Lambda + verify
  }

  const topic = request.headers.get("X-Shopify-Topic") ?? "";
  const payload = (await request.json()) as {
    id?: number;
    admin_graphql_api_id?: string;
    title?: string;
    body_html?: string;
    handle?: string;
  };

  if (!topic.includes("pages/")) {
    return data({ ok: true, skipped: true });
  }

  const gid =
    payload.admin_graphql_api_id ??
    (payload.id ? `gid://shopify/Page/${payload.id}` : null);
  if (!gid) return data({ ok: true, skipped: true });

  const ctx = await ensureServerContext();
  const shops = await ctx.repo.listShops();
  for (const shop of shops) {
    const pages = await ctx.repo.listPagesByShop(shop.id);
    const match = pages.find((p) => p.shopifyPageGid === gid);
    if (!match) continue;
    const bodyHtml = payload.body_html ?? "";
    const visbuildData = visbuildDataFromShopifyBody(
      payload.title ?? match.title,
      bodyHtml
    );
    await savePageDraft(match.pageId, ctx, visbuildData);
    match.status = "dirty";
    await ctx.repo.putPageIndex(match);
    return data({ ok: true, pageId: match.pageId });
  }

  return data({ ok: true, matched: false });
}
