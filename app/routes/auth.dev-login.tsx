import { redirect } from "react-router";

import type { Route } from "./+types/auth.dev-login";
import { ensureServerContext } from "~/lib/server/factory";
import { normalizeShopDomain, upsertShopRecord } from "~/lib/server/page-ops";
import { setShopSessionCookie } from "~/lib/server/shopify-oauth.server";

function devLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
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

  return redirect(next, {
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
