import { data } from "react-router";

import type { Route } from "./+types/api.assets.upload-url";
import { createAssetUploadUrl } from "~/lib/server/aws/assets.s3";
import { authenticateAppAdmin } from "~/lib/server/shopify-auth.server";

export async function action({ request }: Route.ActionArgs) {
  await authenticateAppAdmin(request);
  if (request.method !== "POST") {
    return data({ error: "Method not allowed" }, { status: 405 });
  }
  const body = (await request.json()) as {
    filename?: string;
    contentType?: string;
  };
  const filename = body.filename?.trim() || `upload-${Date.now()}`;
  const contentType = body.contentType?.trim() || "application/octet-stream";
  const key = `uploads/${crypto.randomUUID()}/${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  try {
    const urls = await createAssetUploadUrl({ key, contentType });
    return data({ ok: true, ...urls, key });
  } catch (e) {
    return data(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
