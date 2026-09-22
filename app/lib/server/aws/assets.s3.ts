import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getAssetsBucket, getAwsRegion } from "../env";

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

  const client = new S3Client({
    region: getAwsRegion(),
    // Default CRC32 checksums land in the presigned URL. Browsers cannot send
    // that header, so the PUT fails after CORS. Sign only when we ask for one.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
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
