import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { getAssetsBucket, getAwsRegion } from "../env";

export async function createAssetUploadUrl(params: {
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<{ uploadUrl: string; publicUrl: string }> {
  const bucket = getAssetsBucket();
  if (!bucket) {
    throw new Error("ASSETS_BUCKET_NAME is not configured");
  }

  const client = new S3Client({ region: getAwsRegion() });
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: params.expiresIn ?? 900,
  });

  const region = getAwsRegion();
  const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${params.key}`;

  return { uploadUrl, publicUrl };
}
