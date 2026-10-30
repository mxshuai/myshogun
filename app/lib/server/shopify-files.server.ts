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

export type ShopifyFilesResult =
  | {
      ok: true;
      files: ShopifyFileRow[];
      endCursor: string | null;
      hasNextPage: boolean;
    }
  | { ok: false; error: string };

export async function listShopifyFilesForShop(
  ctx: ServerContext,
  shopId: string,
  params?: { query?: string; after?: string; first?: number },
): Promise<ShopifyFilesResult> {
  const shop = await ctx.repo.getShop(shopId);
  if (!shop) return { ok: false, error: "Shop not found" };

  const token = await ctx.secrets.getShopToken(shopId);
  if (!token) {
    return { ok: false, error: "Shopify token is not configured for this shop" };
  }

  const term = params?.query?.trim();
  const query = term ? `media_type:IMAGE ${term}` : "media_type:IMAGE";

  try {
    const client = createAdminClient({
      shopDomain: shop.domain,
      accessToken: token,
    });
    const result = await client.listFiles({
      first: params?.first ?? 50,
      after: params?.after,
      query,
    });
    return {
      ok: true,
      files: result.files,
      endCursor: result.pageInfo.endCursor,
      hasNextPage: result.pageInfo.hasNextPage,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const error = /read_files|read_images|read_themes/i.test(message)
      ? `${message} Add read_files to the app SCOPES, then reinstall the app so the shop token is re-issued.`
      : message;
    return { ok: false, error };
  }
}
