import type { Session } from "@shopify/shopify-api";

import type { Repo, ServerContext, Shop } from "./types";
import { normalizeShopDomain, upsertShopRecord } from "./page-ops";

export async function findShopByDomain(
  repo: Repo,
  domain: string
): Promise<Shop | null> {
  const normalized = normalizeShopDomain(domain);
  const shops = await repo.listShops();
  return shops.find((s) => normalizeShopDomain(s.domain) === normalized) ?? null;
}

/** OAuth 完成后：创建/更新店铺记录，并将 access token 写入 Secrets Manager */
export async function syncShopFromSession(
  ctx: ServerContext,
  session: Session
): Promise<Shop> {
  if (!session.accessToken) {
    throw new Error("OAuth session missing accessToken");
  }

  const domain = normalizeShopDomain(session.shop);
  const existing = await findShopByDomain(ctx.repo, domain);
  const shop = await upsertShopRecord(ctx.repo, {
    id: existing?.id,
    domain,
    name: existing?.name ?? domain.replace(".myshopify.com", ""),
  });
  await ctx.secrets.setShopToken(shop.id, session.accessToken);
  return shop;
}
