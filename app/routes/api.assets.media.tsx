import { data } from "react-router";

import type { Route } from "./+types/api.assets.media";
import {
  isAllowedMediaUrl,
  verifyMediaUpload,
} from "~/lib/server/assets.server";
import { requireMediaShopAccess } from "~/lib/server/media-auth.server";
import { ensureServerContext } from "~/lib/server/factory";
import type { MediaAsset } from "~/lib/server/types";

const DEFAULT_PAGE_SIZE = 28;

function mapAsset(a: MediaAsset) {
  return {
    id: a.assetId,
    url: a.url,
    filename: a.filename,
    contentType: a.contentType,
    size: a.size,
    width: a.width,
    height: a.height,
    createdAt: a.createdAt,
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await ensureServerContext();
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shopDomain")?.trim() ?? "";
  if (!shopDomain) {
    return data({ error: "shopDomain is required" }, { status: 400 });
  }

  const shop = await requireMediaShopAccess(request, shopDomain, ctx);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.max(
    1,
    Number(url.searchParams.get("limit")) || DEFAULT_PAGE_SIZE,
  );
  const query = url.searchParams.get("query")?.trim() || undefined;
  const firstPageLimitRaw = url.searchParams.get("firstPageLimit");
  const firstPageLimit =
    firstPageLimitRaw != null && firstPageLimitRaw !== ""
      ? Math.max(1, Number(firstPageLimitRaw) || limit)
      : undefined;

  const result = await ctx.repo.listMediaAssets(shop.id, {
    page,
    limit,
    query,
    firstPageLimit,
  });
  return data({
    ok: true,
    assets: result.assets.map(mapAsset),
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    totalPages: result.totalPages,
  });
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }

  const ctx = await ensureServerContext();
  const body = (await request.json()) as {
    shopDomain?: string;
    url?: string;
    filename?: string;
    contentType?: string;
    size?: number | null;
    width?: number | null;
    height?: number | null;
  };

  const shopDomain = body.shopDomain?.trim() ?? "";
  const url = body.url?.trim() ?? "";
  if (!shopDomain || !url) {
    return data({ error: "shopDomain and url are required" }, { status: 400 });
  }

  const shop = await requireMediaShopAccess(request, shopDomain, ctx);
  if (!isAllowedMediaUrl(url, shop.id)) {
    return data(
      { error: "Image URL must be an upload for this shop" },
      { status: 400 },
    );
  }

  const verified = await verifyMediaUpload(url, shop.id);
  if (!verified) {
    return data(
      { error: "Upload was not found or is not a valid image" },
      { status: 400 },
    );
  }

  const filename =
    body.filename?.trim() || url.split("/").pop()?.split("?")[0] || "image";
  const asset: MediaAsset = {
    assetId: crypto.randomUUID(),
    shopId: shop.id,
    url,
    filename,
    contentType: body.contentType?.trim() || verified.contentType,
    size: body.size ?? verified.size,
    width: body.width ?? null,
    height: body.height ?? null,
    createdAt: new Date().toISOString(),
  };

  await ctx.repo.putMediaAsset(asset);
  return data({
    ok: true,
    asset: mapAsset(asset),
  });
}
