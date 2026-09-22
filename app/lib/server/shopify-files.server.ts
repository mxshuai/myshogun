import { createAdminClient } from "./shopify";
import type { ServerContext } from "./types";

export type ShopifyFileRow = {
  id: string;
  url: string;
  alt: string | null;
  filename: string;
  width: number | null;
  height: number | null;
  size: number | null;
};

export async function listShopifyFilesForShop(
  ctx: ServerContext,
  shopId: string,
  params?: { query?: string; after?: string; first?: number },
): Promise<{ files: ShopifyFileRow[]; endCursor: string | null; hasNextPage: boolean }> {
  const shop = await ctx.repo.getShop(shopId);
  if (!shop) return { files: [], endCursor: null, hasNextPage: false };

  const token = await ctx.secrets.getShopToken(shopId);
  if (!token) return { files: [], endCursor: null, hasNextPage: false };

  try {
    const client = createAdminClient({
      shopDomain: shop.domain,
      accessToken: token,
    });
    const result = await client.listFiles({
      first: params?.first ?? 50,
      after: params?.after,
      query: params?.query,
    });
    return {
      files: result.files,
      endCursor: result.pageInfo.endCursor,
      hasNextPage: result.pageInfo.hasNextPage,
    };
  } catch {
    return { files: [], endCursor: null, hasNextPage: false };
  }
}
