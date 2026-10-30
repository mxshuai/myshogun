import { redirect } from "react-router";

import type { Route } from "./+types/auth.dev-login";
import { DEV_LOCAL_SHOP_TOKEN } from "~/lib/server/dev-auth.server";
import { isProductionRuntime } from "~/lib/server/env";
import { ensureServerContext } from "~/lib/server/factory";
import { normalizeShopDomain, upsertShopRecord } from "~/lib/server/page-ops";
import { resolvePostAuthNext } from "~/lib/shop-url";
import { setShopSessionCookie } from "~/lib/server/shopify-oauth.server";

function devLoginEnabled(): boolean {
  // Never enable in a deployed environment. Relying on NODE_ENV alone is unsafe
  // because Amplify SSR does not set NODE_ENV=production, which would otherwise
  // expose this OAuth-bypassing backdoor in production.
  return !isProductionRuntime();
}

function sanitizeNext(raw: string | null): string {
  const value = (raw ?? "").trim();
  if (!value.startsWith("/") || value.startsWith("//")) return "/pages";
  return value;
}

/**
 * Local-only shortcut to obtain a shop session without the real Shopify OAuth
 * handshake. Disabled entirely in production. Usage:
 *   /auth/dev-login?shop=devstore.myshopify.com&next=/pages
 */
export async function loader({ request }: Route.LoaderArgs) {
  if (!devLoginEnabled()) {
    throw new Response("Not Found", { status: 404 });
  }

  const url = new URL(request.url);
  const shopRaw = url.searchParams.get("shop")?.trim() || "dev-shop.myshopify.com";
  const next = sanitizeNext(url.searchParams.get("next"));
  const shop = normalizeShopDomain(shopRaw);

  const ctx = await ensureServerContext();
  const shopRecord = await upsertShopRecord(ctx.repo, {
    domain: shop,
    name: shop,
  });

  const envShop = process.env.SHOPIFY_SHOP_DOMAIN?.trim();
  const envToken = process.env.SHOPIFY_ACCESS_TOKEN?.trim();
  const token =
    envToken &&
    envShop &&
    normalizeShopDomain(envShop) === shop
      ? envToken
      : DEV_LOCAL_SHOP_TOKEN;
  await ctx.secrets.setShopToken(shopRecord.id, token);

  const destination = resolvePostAuthNext(next, shopRecord.domain);
  return redirect(destination, {
    headers: {
      "Set-Cookie": setShopSessionCookie({
        shopId: shopRecord.id,
        shopDomain: shopRecord.domain,
      }),
    },
  });
}

export default function DevLogin() {
  return null;
}
