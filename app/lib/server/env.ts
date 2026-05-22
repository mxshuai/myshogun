export function useAwsDataLayer(): boolean {
  const v = process.env.USE_AWS_DATA_LAYER?.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  if (v === "0" || v === "false" || v === "no") return false;
  // Amplify SSR 中若分支变量未按预期注入，默认在生产环境走 AWS 数据层，避免回退到本地文件存储导致 500。
  return process.env.NODE_ENV === "production";
}

/** Amplify 禁止以 AWS 开头的自定义环境变量；可设 APP_AWS_REGION。运行时仍可读自动注入的 AWS_REGION。 */
export function getAwsRegion(): string {
  return (
    process.env.APP_AWS_REGION?.trim() ||
    process.env.AWS_REGION?.trim() ||
    "ap-southeast-2"
  );
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
