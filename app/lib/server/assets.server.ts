import { guessImageContentType } from "~/lib/image-mime";

import { createAssetUploadUrl, headUploadedObject } from "./aws/assets.s3";
import {
  buildDevPublicUrl,
  buildDevUploadUrl,
  readDevUploadFile,
} from "./dev/assets.dev";
import { getAssetsBucket, getAwsRegion, useAwsDataLayer } from "./env";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

export type AssetUploadTarget = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  storage: "s3" | "dev";
};

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function assertAllowedImageUpload(params: {
  contentType: string;
  size?: number | null;
}): void {
  const contentType = params.contentType.trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error(
      "Only JPEG, PNG, GIF, WebP, and AVIF images can be uploaded",
    );
  }
  if (params.size == null || params.size <= 0 || params.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be between 1 byte and 10 MB");
  }
}

export function isAllowedMediaUrl(url: string, shopId: string): boolean {
  const prefix = `/uploads/${shopId}/`;
  if (url.startsWith(`/dev-uploads${prefix}`)) return true;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" || !parsed.pathname.startsWith(prefix)) {
    return false;
  }

  const bucket = getAssetsBucket();
  if (!bucket) return false;
  const region = getAwsRegion();
  return parsed.hostname === `${bucket}.s3.${region}.amazonaws.com`;
}

export function isOwnedUploadKey(key: string, shopId: string): boolean {
  return key.startsWith(`uploads/${shopId}/`) && !key.includes("..");
}

export function mediaUrlToUploadKey(url: string, shopId: string): string | null {
  if (!isAllowedMediaUrl(url, shopId)) return null;

  if (url.startsWith("/dev-uploads/")) {
    return url.replace(/^\/dev-uploads\//, "");
  }

  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/+/, "");
  } catch {
    return null;
  }
}

export async function verifyMediaUpload(
  url: string,
  shopId: string,
): Promise<{ contentType: string; size: number } | null> {
  const key = mediaUrlToUploadKey(url, shopId);
  if (!key) return null;

  if (url.startsWith("/dev-uploads/")) {
    const body = await readDevUploadFile(key);
    if (!body?.length) return null;
    const contentType = guessImageContentType(key);
    try {
      assertAllowedImageUpload({ contentType, size: body.length });
    } catch {
      return null;
    }
    return { contentType, size: body.length };
  }

  const head = await headUploadedObject(key);
  if (!head) return null;
  try {
    assertAllowedImageUpload({
      contentType: head.contentType,
      size: head.contentLength,
    });
  } catch {
    return null;
  }
  return { contentType: head.contentType, size: head.contentLength };
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
  size?: number | null;
}): Promise<AssetUploadTarget> {
  assertAllowedImageUpload({
    contentType: params.contentType,
    size: params.size,
  });
  const safeName = sanitizeFilename(params.filename.trim() || `upload-${Date.now()}`);
  const key = `uploads/${params.shopId}/${crypto.randomUUID()}/${safeName}`;
  const storage = resolveAssetStorage();

  if (storage === "s3") {
    const urls = await createAssetUploadUrl({
      key,
      contentType: params.contentType,
      contentLength: params.size ?? undefined,
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
