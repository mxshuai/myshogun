import { data } from "react-router";

import { authenticate } from "~/shopify.server";
import { ensureServerContext } from "~/lib/server/factory";
import { visbuildDataFromShopifyBody } from "~/lib/server/page-ops";
import { savePageDraft } from "~/lib/server/publish";
import { findShopByDomain } from "~/lib/server/shop-sync.server";

import type { Route } from "./+types/webhooks.pages.update";

export async function action({ request }: Route.ActionArgs) {
  const { shop, topic, payload } = await authenticate.webhook(request);

  console.log(`Webhook ${topic} for ${shop}`);

  const body = payload as {
    id?: number;
    admin_graphql_api_id?: string;
    title?: string;
    body_html?: string;
  };

  const gid =
    body.admin_graphql_api_id ??
    (body.id ? `gid://shopify/Page/${body.id}` : null);
  if (!gid) return new Response();

  const ctx = await ensureServerContext();
  const shopRecord = await findShopByDomain(ctx.repo, shop);
  if (!shopRecord) return new Response();

  const pages = await ctx.repo.listPagesByShop(shopRecord.id);
  const match = pages.find((p) => p.shopifyPageGid === gid);
  if (!match) return new Response();

  const visbuildData = visbuildDataFromShopifyBody(
    body.title ?? match.title,
    body.body_html ?? ""
  );
  await savePageDraft(match.pageId, ctx, visbuildData);
  match.status = "dirty";
  await ctx.repo.putPageIndex(match);

  return data({ ok: true, pageId: match.pageId });
}
