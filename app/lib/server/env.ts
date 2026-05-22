export function useAwsDataLayer(): boolean {
  const v = process.env.USE_AWS_DATA_LAYER?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function getAwsRegion(): string {
  return process.env.AWS_REGION?.trim() || "us-east-1";
}

export function getDynamoTableName(): string {
  return process.env.APP_TABLE_NAME?.trim() || "visbuild-shopify-app";
}

export function getPublishLambdaArn(): string | undefined {
  return process.env.PUBLISH_LAMBDA_ARN?.trim() || undefined;
}

export function getSchedulerRoleArn(): string | undefined {
  return process.env.SCHEDULER_ROLE_ARN?.trim() || undefined;
}

export function getAssetsBucket(): string | undefined {
  return process.env.ASSETS_BUCKET_NAME?.trim() || undefined;
}

export function getAdminApiKey(): string | undefined {
  return process.env.ADMIN_API_KEY?.trim() || undefined;
}
