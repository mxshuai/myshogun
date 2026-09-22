import { requireShopSession } from "./auth.server";
import { findShopByDomain } from "./shop-route.server";
import type { ServerContext, Shop } from "./types";

export async function requireMediaShopAccess(
  request: Request,
  shopDomain: string,
  ctx: ServerContext,
): Promise<Shop> {
  requireShopSession(request);
  const shop = await findShopByDomain(ctx, shopDomain);
  if (!shop) {
    throw new Response("Shop not found", { status: 404 });
  }
  return shop;
}
