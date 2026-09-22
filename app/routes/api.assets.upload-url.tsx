import { data } from "react-router";

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
  };
  const shopDomain = body.shopDomain?.trim() ?? "";
  if (!shopDomain) {
    return data({ error: "shopDomain is required" }, { status: 400 });
  }

  const ctx = await ensureServerContext();
  const shop = await requireMediaShopAccess(request, shopDomain, ctx);

  const filename = body.filename?.trim() || `upload-${Date.now()}`;
  const contentType = body.contentType?.trim() || "application/octet-stream";

  try {
    const target = await createAssetUploadTarget({
      shopId: shop.id,
      filename,
      contentType,
    });
    return data({ ok: true, ...target });
  } catch (e) {
    return data(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
