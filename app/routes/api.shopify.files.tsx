import { data } from "react-router";

import type { Route } from "./+types/api.shopify.files";
import { requireMediaShopAccess } from "~/lib/server/media-auth.server";
import { ensureServerContext } from "~/lib/server/factory";
import { listShopifyFilesForShop } from "~/lib/server/shopify-files.server";

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await ensureServerContext();
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shopDomain")?.trim() ?? "";
  if (!shopDomain) {
    return data({ error: "shopDomain is required" }, { status: 400 });
  }

  const shop = await requireMediaShopAccess(request, shopDomain, ctx);
  const query = url.searchParams.get("query")?.trim() || undefined;
  const after = url.searchParams.get("after")?.trim() || undefined;
  const result = await listShopifyFilesForShop(ctx, shop.id, { query, after });

  return data({
    ok: true,
    files: result.files,
    endCursor: result.endCursor,
    hasNextPage: result.hasNextPage,
  });
}
