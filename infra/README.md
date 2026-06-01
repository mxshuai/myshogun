# AWS 数据面（阶段二）

部署 [`template.yaml`](template.yaml) 可创建：

- DynamoDB 单表 `AppTable`（PK/SK + GSI1 用于 pending jobs）
- Publish Lambda（需 `npm run build:lambda` 后替换 ZipFile）
- Schedule Lambda（需 `npm run build:lambda:schedule` 后替换 ZipFile；SSR Invoke，执行 PassRole + CreateSchedule）
- EventBridge Scheduler 调用角色
- CloudWatch 告警（Lambda Errors）

## 部署示例

```bash
aws cloudformation deploy \
  --template-file infra/template.yaml \
  --stack-name visbuild-shopify-data \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides AppTableName=visbuild-shopify-app
```

将 Outputs 写入 Amplify 环境变量：

- `USE_AWS_DATA_LAYER=true`
- `APP_TABLE_NAME`
- `PUBLISH_LAMBDA_ARN`
- `SCHEDULER_ROLE_ARN`
- `SCHEDULE_LAMBDA_ARN`（Amplify SSR）
- `APP_AWS_REGION`（勿用 `AWS_REGION`，Amplify 保留前缀）
- `ASSETS_BUCKET_NAME`（若创建 S3）

并为 **Amplify SSR 计算角色**附加 [`amplify-ssr-iam-policy.json`](amplify-ssr-iam-policy.json)（DDB、Secrets、`lambda:Invoke` Schedule Lambda）。**不要**给 compute 角色挂 PassRole。
