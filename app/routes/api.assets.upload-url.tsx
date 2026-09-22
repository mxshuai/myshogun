import { data } from "react-router";

import { resolveImageContentType } from "~/lib/image-mime";
import type { Route } from "./+types/api.assets.upload-url";
import { createAssetUploadTarget } from "~/lib/server/assets.server";
import { requireMediaShopAccess } from "~/lib/server/media-auth.server";
import { ensureServerContext } from "~/lib/server/factory";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }
  const body = (await request.json()) as {
    shopDomain?: string;
    filename?: string;
    contentType?: string;
    size?: number;
  };
  const shopDomain = body.shopDomain?.trim() ?? "";
  if (!shopDomain) {
    return data({ error: "shopDomain is required" }, { status: 400 });
  }

  const ctx = await ensureServerContext();
  const shop = await requireMediaShopAccess(request, shopDomain, ctx);

  const filename = body.filename?.trim() || `upload-${Date.now()}`;
  const contentType = resolveImageContentType(filename, body.contentType);

  try {
    const target = await createAssetUploadTarget({
      shopId: shop.id,
      filename,
      contentType,
      size: typeof body.size === "number" ? body.size : null,
    });
    return data({ ok: true, ...target });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = /Only JPEG|10 MB|ASSETS_BUCKET_NAME/.test(message) ? 400 : 500;
    return data({ error: message }, { status });
  }
}
