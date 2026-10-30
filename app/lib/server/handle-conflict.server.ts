import { isDevPlaceholderShopToken } from "./dev-auth.server";
import { isProductionRuntime } from "./env";
import { createAdminClient, ShopifyApiError } from "./shopify";
import { normalizeHandle } from "./page-ops";
import type { PageIndex, ServerContext } from "./types";

export type HandleConflictResult =
  | { ok: true }
  | { ok: false; error: string };

function handleFromPath(path: string): string {
  if (path === "/") return "home";
  return normalizeHandle(path) || "page";
}

async function findLocalPageByHandle(
  ctx: ServerContext,
  shopId: string,
  handle: string,
  excludePageId?: string,
): Promise<PageIndex | null> {
  const pages = await ctx.repo.listPagesByShop(shopId);
  return (
    pages.find(
      (p) => p.handle === handle && (!excludePageId || p.pageId !== excludePageId),
    ) ?? null
  );
}

async function findShopifyPageByHandle(
  ctx: ServerContext,
  shopId: string,
  handle: string,
): Promise<{ id: string; title: string } | null> {
  const shop = await ctx.repo.getShop(shopId);
  if (!shop) return null;
  const token = await ctx.secrets.getShopToken(shopId);
  if (!token || isDevPlaceholderShopToken(token)) return null;

  const client = createAdminClient({
    shopDomain: shop.domain,
    accessToken: token,
  });

  try {
    let after: string | undefined;
    do {
      const batch = await client.listPages({ first: 50, after });
      for (const node of batch.nodes) {
        if (node.handle === handle) {
          return { id: node.id, title: node.title };
        }
      }
      if (!batch.pageInfo.hasNextPage) break;
      after = batch.pageInfo.endCursor ?? undefined;
    } while (after);
    return null;
  } catch (e) {
    if (!isProductionRuntime() && e instanceof ShopifyApiError) {
      console.warn(
        `[handle-conflict] Shopify lookup skipped (${e.status ?? "error"}): ${e.message}`,
      );
      return null;
    }
    throw e;
  }
}

/**
 * Ensure handle is free in our DB and on Shopify (when token is configured).
 */
export async function validatePageHandleForShop(
  ctx: ServerContext,
  shopId: string,
  path: string,
  options?: { excludePageId?: string; excludeShopifyGid?: string | null },
): Promise<HandleConflictResult> {
  const handle = handleFromPath(path);

  const local = await findLocalPageByHandle(
    ctx,
    shopId,
    handle,
    options?.excludePageId,
  );
  if (local) {
    return {
      ok: false,
      error: `Handle "${handle}" is already used by page ${local.pagePath} in this app`,
    };
  }

  const remote = await findShopifyPageByHandle(ctx, shopId, handle);
  if (
    remote &&
    (!options?.excludeShopifyGid || remote.id !== options.excludeShopifyGid)
  ) {
    return {
      ok: false,
      error: `Handle "${handle}" already exists on Shopify (page: ${remote.title})`,
    };
  }

  return { ok: true };
}
