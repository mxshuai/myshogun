import { redirect } from "react-router";

import { decodeShopDomainParam, devLoginUrl } from "~/lib/shop-url";
import { isProductionRuntime } from "./env";
import { requireShopSession } from "./auth.server";
import { normalizeShopDomain } from "./page-ops";
import { beginShopifyOAuth } from "./shopify-oauth.server";
import type { ShopSession } from "./shopify-oauth.server";
import type { ServerContext, Shop } from "./types";

export async function findShopByDomain(
  ctx: ServerContext,
  domainRaw: string,
): Promise<Shop | null> {
  const domain = normalizeShopDomain(decodeShopDomainParam(domainRaw));
  const shops = await ctx.repo.listShops();
  return shops.find((s) => s.domain === domain) ?? null;
}

/**
 * Merchant routes: shop comes from the URL, not the session cookie.
 * Session only proves login; token must exist for the URL shop (else OAuth).
 */
export async function requireShopRouteContext(
  request: Request,
  shopDomainParam: string,
  ctx: ServerContext,
): Promise<{ shop: Shop; session: ShopSession }> {
  const session = requireShopSession(request);

  const shop = await findShopByDomain(ctx, shopDomainParam);
  if (!shop) {
    throw new Response("Shop not found", { status: 404 });
  }

  const token = await ctx.secrets.getShopToken(shop.id);
  if (!token) {
    const url = new URL(request.url);
    const next = url.pathname + url.search;
    if (!isProductionRuntime()) {
      throw redirect(devLoginUrl(shop.domain, next));
    }
    return beginShopifyOAuth(request, shop.domain, next) as never;
  }

  return { shop, session };
}
