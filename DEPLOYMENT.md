# 部署说明

本仓库使用 **AWS Amplify Hosting** 托管 **React Router v7 SSR** 应用，构建由 **Vite** 与 **`vite-plugin-react-router-amplify-hosting`** 生成 Amplify 所需的 **`.amplify-hosting`** 目录。

---

## 技术要点

| 项目 | 说明 |
|------|------|
| 框架 | React Router 7（SSR）+ Vite |
| Amplify 集成插件 | `vite-plugin-react-router-amplify-hosting`（见 `vite.config.ts`） |
| 构建产物目录 | **`.amplify-hosting`**（Amplify 控制台上传此目录内容） |
| Node 版本 | **20**（`package.json` 的 `engines` 与 `amplify.yml` 中 `nvm use 20` 一致） |

---

## 在 AWS Amplify 控制台接入

1. 打开 [AWS Amplify 控制台](https://console.aws.amazon.com/amplify/)，选择 **Create new app** → **Host web app**。
2. 连接 Git 提供商与仓库、选择要部署的分支。
3.构建设置：确认使用仓库根目录的 **`amplify.yml`**（或由控制台自动生成后替换为仓库内版本）。
4. 首次保存并部署；后续推送该分支会触发自动构建。

`amplify.yml` 当前行为简述：

- **preBuild**：安装 Node 20、`npm ci`（带 npm 缓存目录 `.npm`）。
- **build**：`npm run build`（即 `react-router build`，并产出 `.amplify-hosting`）。
- **artifacts**：`baseDirectory: .amplify-hosting`，打包其下所有文件。

---

## 本地构建与预览（对齐 Amplify 产物）

```bash
npm ci
npm run build
```

标准 Node 服务入口（默认 React Router 输出，与 Amplify 产物路径不同）：

```bash
npm start
```

**模拟 Amplify 托管侧加载 SSR 入口**（需先完成会生成 `.amplify-hosting` 的构建）：

```bash
npm run preview:amplify
```

该命令会执行：`node ./.amplify-hosting/compute/default/server.mjs`。若本地不存在该文件，请先运行 `npm run build`。

---

## 环境变量

在 **Amplify 控制台 → 你的应用 → Hosting → Environment variables** 中为各分支配置变量。

当前代码若仍主要依赖仓库内 JSON（如 `database.json`、`page-metadata.json`）做演示，则**通常无需**在控制台配置密钥。后续接入 **Shopify Admin API**、**DynamoDB**、**Secrets Manager** 等时，应在此集中配置（例如 API 版本、表名、功能开关），**勿**将密钥提交进 Git。

---

## 自定义域名与 HTTPS

在 Amplify 控制台 **Domain management** 中绑定域名；证书与重定向由 Amplify 与 ACM 协同处理（按控制台向导操作即可）。

---

## 生产环境注意事项

1. **无持久化本地磁盘**：Amplify SSR 计算环境不应依赖写入仓库内 JSON 文件作为唯一数据源；多实例或重启会导致数据不一致或丢失。若要做正式多用户/多端部署，需要 **DynamoDB（或同类托管存储）** 等后端持久化（参见项目内产品计划：`visbuild-shopify-aws-saas`）。
2. **定时任务**：不应仅依赖单实例进程内的 `setTimeout` 做生产级定时发布；应使用 **EventBridge Scheduler + Lambda** 等托管调度。
3. **观测**：在 Amplify 控制台查看构建与访问日志；后端 Lambda 等需在 **CloudWatch** 单独配置指标与告警。

---

## Shopify 管理后台（阶段一）

- `/admin/shops` — 店铺与 Access Token
- `/admin/shops/:shopId/pages` — 页面列表与从 Shopify 导入
- `/admin/pages/:pageId` — Puck 编辑器（Save Draft / Publish Now / Schedule Update）

可选环境变量：

| 变量 | 说明 |
|------|------|
| `ADMIN_API_KEY` | 设置后访问 `/admin/*` 需登录或 `X-Admin-Key` 头 |
| `USE_AWS_DATA_LAYER` | `true` 时启用 DynamoDB / Secrets Manager / EventBridge |
| `APP_TABLE_NAME` | DynamoDB 表名 |
| `PUBLISH_LAMBDA_ARN` / `SCHEDULER_ROLE_ARN` | 定时发布 |
| `ASSETS_BUCKET_NAME` | S3 预签上传 |
| `SHOPIFY_WEBHOOK_SECRET` | Webhook HMAC（可选） |

基础设施模板见 [`infra/template.yaml`](infra/template.yaml)。

**生产全链路（悉尼区）**：见 [`PRODUCTION_DEPLOY.md`](PRODUCTION_DEPLOY.md)（含五步在 AWS / 本地的详细变化说明；Account `124074140777`，Region `ap-southeast-2`，资源前缀 **visbuild**）。

## 相关文件

- [`amplify.yml`](amplify.yml) — Amplify CI/CD 构建规范  
- [`vite.config.ts`](vite.config.ts) — `amplifyHosting()` 插件  
- [`package.json`](package.json) — `build` / `preview:amplify` 脚本  
