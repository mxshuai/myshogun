import { createAssetUploadUrl } from "./aws/assets.s3";
import {
  buildDevPublicUrl,
  buildDevUploadUrl,
} from "./dev/assets.dev";
import { getAssetsBucket, useAwsDataLayer } from "./env";

export type AssetUploadTarget = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  storage: "s3" | "dev";
};

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function resolveAssetStorage(): "s3" | "dev" {
  if (getAssetsBucket()) return "s3";
  if (!useAwsDataLayer()) return "dev";
  throw new Error(
    "ASSETS_BUCKET_NAME is not configured. Set it in Amplify env or .env.production.local when USE_AWS_DATA_LAYER=true.",
  );
}

export async function createAssetUploadTarget(params: {
  shopId: string;
  filename: string;
  contentType: string;
}): Promise<AssetUploadTarget> {
  const safeName = sanitizeFilename(params.filename.trim() || `upload-${Date.now()}`);
  const key = `uploads/${params.shopId}/${crypto.randomUUID()}/${safeName}`;
  const storage = resolveAssetStorage();

  if (storage === "s3") {
    const urls = await createAssetUploadUrl({
      key,
      contentType: params.contentType,
    });
    return { ...urls, key, storage: "s3" };
  }

  return {
    uploadUrl: buildDevUploadUrl(key),
    publicUrl: buildDevPublicUrl(key),
    key,
    storage: "dev",
  };
}
