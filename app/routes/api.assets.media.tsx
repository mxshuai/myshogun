import { data } from "react-router";

import type { Route } from "./+types/api.assets.media";
import { isAllowedMediaUrl } from "~/lib/server/assets.server";
import { requireMediaShopAccess } from "~/lib/server/media-auth.server";
import { ensureServerContext } from "~/lib/server/factory";
import type { MediaAsset } from "~/lib/server/types";

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await ensureServerContext();
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shopDomain")?.trim() ?? "";
  if (!shopDomain) {
    return data({ error: "shopDomain is required" }, { status: 400 });
  }

  const shop = await requireMediaShopAccess(request, shopDomain, ctx);
  const assets = await ctx.repo.listMediaAssets(shop.id);
  return data({
    ok: true,
    assets: assets.map((a) => ({
      id: a.assetId,
      url: a.url,
      filename: a.filename,
      contentType: a.contentType,
      size: a.size,
      width: a.width,
      height: a.height,
      createdAt: a.createdAt,
    })),
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
  const filename =
    body.filename?.trim() || url.split("/").pop()?.split("?")[0] || "image";
  const asset: MediaAsset = {
    assetId: crypto.randomUUID(),
    shopId: shop.id,
    url,
    filename,
    contentType: body.contentType?.trim() || "image/jpeg",
    size: body.size ?? null,
    width: body.width ?? null,
    height: body.height ?? null,
    createdAt: new Date().toISOString(),
  };

  await ctx.repo.putMediaAsset(asset);
  return data({
    ok: true,
    asset: {
      id: asset.assetId,
      url: asset.url,
      filename: asset.filename,
      contentType: asset.contentType,
      size: asset.size,
      width: asset.width,
      height: asset.height,
      createdAt: asset.createdAt,
    },
  });
}
