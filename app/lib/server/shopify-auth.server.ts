import { authenticateAdmin } from "~/lib/shopify-authenticate.server";
import { ensureServerContext } from "./factory";
import { findShopByDomain } from "./shop-sync.server";
import type { Shop } from "./types";

export async function authenticateAppAdmin(request: Request) {
  const { session, admin } = await authenticateAdmin(request);
  const ctx = await ensureServerContext();
  const shop = await findShopByDomain(ctx.repo, session.shop);
  if (!shop) {
    throw new Response(
      "Shop not linked. Please reinstall the app from Shopify Admin.",
      { status: 403 }
    );
  }
  return { session, admin, shop, ctx };
}

export type AppAdminContext = Awaited<ReturnType<typeof authenticateAppAdmin>>;
