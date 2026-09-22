# AWS 数据面（统一构建与维护）

## 架构

| 组件 | 创建方式 | 说明 |
|------|----------|------|
| DynamoDB、Publish/Schedule Lambda 骨架、IAM、告警 | [`template.yaml`](template.yaml) CloudFormation | `npm run deploy:data-plane` |
| S3 媒体桶（CORS + `uploads/*` 公开读） | [`scripts/setup-assets-bucket.ps1`](../scripts/setup-assets-bucket.ps1) | 数据面部署后自动执行；避开 CFN Guard 对公开读桶的拦截 |
| Lambda 业务代码 | `build:lambda` + `deploy:*-lambda` | esbuild CJS 打包 |
| Amplify SSR IAM | [`amplify-ssr-iam-policy.json`](amplify-ssr-iam-policy.json) | `npm run generate:amplify-policy` 从配置生成 |

## 统一配置 [`deploy.config.json`](deploy.config.json)

```json
{
  "awsAccountId": "124074140777",
  "region": "ap-southeast-2",
  "stackName": "visbuild-shopify-data",
  "assetsBucketName": "visbuild-media-124074140777",
  "assetsCorsAllowedOrigins": ["http://localhost:5173", "https://your-app.amplifyapp.com"],
  "amplifyAppUrl": "https://your-app.amplifyapp.com"
}
```

## 一条命令

```powershell
npm run deploy:aws
```

顺序：CloudFormation → S3 媒体桶 → Publish Lambda → Schedule Lambda → 生成 IAM 策略 → 打印 Amplify 环境变量。

## 分步命令

```powershell
npm run deploy:data-plane      # CFN + S3 桶
npm run deploy:publish-lambda
npm run deploy:schedule-lambda
npm run generate:amplify-policy
npm run print:amplify-env
```

## Amplify 侧

1. `npm run print:amplify-env` → 粘贴到 Amplify Environment variables（含 `ASSETS_BUCKET_NAME`）
2. 将 `amplify-ssr-iam-policy.json` 附加到 SSR compute 角色
3. `SCOPES` 含 `read_files`（Shopify 图片标签）
