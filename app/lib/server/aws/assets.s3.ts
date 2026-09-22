import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getAssetsBucket, getAwsRegion } from "../env";

function s3Client() {
  return new S3Client({
    region: getAwsRegion(),
    // Default CRC32 checksums land in the presigned URL. Browsers cannot send
    // that header, so the PUT fails after CORS. Sign only when we ask for one.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export async function createAssetUploadUrl(params: {
  key: string;
  contentType: string;
  contentLength?: number;
  expiresIn?: number;
}): Promise<{ uploadUrl: string; publicUrl: string }> {
  const bucket = getAssetsBucket();
  if (!bucket) {
    throw new Error("ASSETS_BUCKET_NAME is not configured");
  }

  const client = s3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
    ...(params.contentLength != null
      ? { ContentLength: params.contentLength }
      : {}),
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: params.expiresIn ?? 900,
    // Browser PUT sends Content-Type. If it is not in the signature, S3 returns 403.
    signableHeaders: new Set(["content-type", "content-length"]),
  });

  const region = getAwsRegion();
  const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${params.key}`;

  return { uploadUrl, publicUrl };
}

export async function headUploadedObject(
  key: string,
): Promise<{ contentType: string; contentLength: number } | null> {
  const bucket = getAssetsBucket();
  if (!bucket) return null;

  try {
    const res = await s3Client().send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    if (res.ContentLength == null || res.ContentLength <= 0) return null;
    return {
      contentType: (res.ContentType ?? "application/octet-stream").trim().toLowerCase(),
      contentLength: res.ContentLength,
    };
  } catch {
    return null;
  }
}
