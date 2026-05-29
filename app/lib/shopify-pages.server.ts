import {
  createManagedPage,
  visbuildDataFromShopifyBody,
} from "./server/page-ops";
import { savePageDraft } from "./server/publish";
import { createAdminClient } from "./server/shopify";
import type { ServerContext } from "./server/types";

export type ShopifyPageRow = {
  id: string;
  title: string;
  handle: string;
  filterType: string;
  isHome?: boolean;
  imported: boolean;
};

/**
 * List the live Shopify pages for a shop, flagging which ones are already
 * imported into the shop's editor pages. Returns an empty list (never throws)
 * when no token is configured or Shopify is unreachable, so the UI degrades
 * gracefully.
 */
export async function listShopifyPagesForShop(
  ctx: ServerContext,
  shopId: string,
): Promise<ShopifyPageRow[]> {
  const shop = await ctx.repo.getShop(shopId);
  if (!shop) return [];
  const token = await ctx.secrets.getShopToken(shopId);
  if (!token) return [];

  const importedGids = new Set(
    (await ctx.repo.listPagesByShop(shopId))
      .map((p) => p.shopifyPageGid)
      .filter((g): g is string => Boolean(g)),
  );

  try {
    const client = createAdminClient({
      shopDomain: shop.domain,
      accessToken: token,
    });
    const rows: ShopifyPageRow[] = [];
    let after: string | undefined;
    do {
      const batch = await client.listPages({ first: 50, after });
      for (const node of batch.nodes) {
        rows.push({
          id: node.id,
          title: node.title,
          handle: node.handle,
          filterType: node.isPublished ? "Published" : "Draft",
          imported: importedGids.has(node.id),
        });
      }
      if (!batch.pageInfo.hasNextPage) break;
      after = batch.pageInfo.endCursor ?? undefined;
    } while (after);
    return rows;
  } catch {
    return [];
  }
}

/**
 * Import a single Shopify page (by GID) into the shop's editor pages. Returns
 * false if no token is set or the page is missing on Shopify.
 */
export async function importShopifyPageForShop(
  ctx: ServerContext,
  shopId: string,
  gid: string,
): Promise<boolean> {
  const shop = await ctx.repo.getShop(shopId);
  if (!shop) return false;
  const token = await ctx.secrets.getShopToken(shopId);
  if (!token) return false;

  const existing = (await ctx.repo.listPagesByShop(shopId)).find(
    (p) => p.shopifyPageGid === gid,
  );
  if (existing) return true;

  const client = createAdminClient({
    shopDomain: shop.domain,
    accessToken: token,
  });
  const remote = await client.getPage(gid);
  if (!remote) return false;

  const visbuildData = visbuildDataFromShopifyBody(remote.title, remote.body);
  const page = await createManagedPage(ctx.repo, {
    shopId,
    title: remote.title,
    handle: remote.handle,
    visbuildData,
    shopifyPageGid: remote.id,
  });
  await savePageDraft(page.pageId, ctx, visbuildData);
  return true;
}
