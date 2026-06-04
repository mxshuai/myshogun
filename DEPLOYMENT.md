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

## 运行场景与数据层配置对照

不同启动方式下「数据层」「登录方式」「必填配置」差异较大，按下表对号入座。

| 场景 | 启动命令 | `NODE_ENV` | 数据层 | 必填配置 | 登录方式 |
|------|----------|-----------|--------|----------|----------|
| **A. 本地快速验证**（推荐） | `npm run dev` | `development` | 本地 dev repo（`.dev-data/repo.json`） | `USE_AWS_DATA_LAYER=false`（或留空） | `/auth/dev-login`；会话用内置 dev 兜底密钥签名，**无需** `SHOPIFY_API_SECRET` |
| **B. 本地连真实 AWS** | `npm run dev` + `USE_AWS_DATA_LAYER=true` | `development` | 真实 DynamoDB / Secrets（悉尼区） | AWS 凭证 + `APP_TABLE_NAME` / `APP_AWS_REGION` | `dev-login` 仍可用；走真实 OAuth 需配 `SHOPIFY_API_KEY/SECRET/SCOPES/SHOPIFY_APP_URL` |
| **C. 本地生产模式** | `npm run start:local-prod` | `production` | 真实 DynamoDB / Secrets | 全套生产变量（见下方环境变量表） | 真实 Shopify OAuth；**dev-login 失效（404）** |
| **D. 生产 Amplify** | push / Redeploy | `production` | 真实 DynamoDB / Secrets | Amplify 控制台全套环境变量 | 真实 Shopify OAuth |

### `USE_AWS_DATA_LAYER` 取值规则

由 [`app/lib/server/env.ts`](app/lib/server/env.ts) 的 `useAwsDataLayer()` 解析：

- `true` / `1` / `yes` → 走 AWS 数据层
- `false` / `0` / `no` → 走本地 dev repo
- **未设置 → 取决于 `NODE_ENV`**：`production` 默认走 AWS，否则走 dev repo

> 因此 `npm run dev` 下「注释掉该变量」等价于 dev repo；但 `npm run start:local-prod`（`NODE_ENV=production`）下「注释掉」会**默认变成 AWS**。为避免两种场景踩坑，建议**显式写 `USE_AWS_DATA_LAYER=false`** 而非注释。

### 关键注意事项

1. **`.env.production.local` 在 dev 下也会被加载**：[`load-production-env.server.ts`](app/lib/load-production-env.server.ts) 在模块导入时读取 `.env.production` / `.env.production.local`。若其中有 `USE_AWS_DATA_LAYER=true`，则连 `npm run dev` 也会连真实 AWS。想要纯本地验证（场景 A），请把该行设为 `false`。
2. **改完 `.env.*` 必须重启进程**：`applyEnvFile` 只在变量未定义时写入，不会覆盖已加载到 `process.env` 的值；HMR 也不会重读。务必 `Ctrl+C` 停掉再重新启动。
3. **会话签名密钥**：生产强制要求真实 `SHOPIFY_API_SECRET`；非生产环境缺该变量时自动使用内置 dev 兜底密钥（`shopify-oauth.server.ts` 的 `resolveSessionSecret()`），使 dev-login 可离线工作。生产安全性不受影响。
4. **dev-login 仅非生产可用**：`NODE_ENV=production` 时 `/auth/dev-login` 返回 404，不会成为生产后门。

---

## 环境变量

在 **Amplify 控制台 → 你的应用 → Hosting → Environment variables** 中为各分支配置变量。

整站已锁定为「Shopify 登录后可访问」，因此**生产必须**配置 OAuth 相关变量（`SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` / `SCOPES` / `SHOPIFY_APP_URL`），否则用户无法登录、`/pages` 与编辑器均不可用。接入 **DynamoDB**、**Secrets Manager** 等时在此集中配置表名与功能开关，**勿**将密钥提交进 Git。

> 旧的仓库内 JSON（`database.json` / `page-metadata.json`）已不再作为 `/pages` 与编辑器的数据源；页面改为按登录店铺隔离存放在 repo（生产 DynamoDB、本地 dev repo）。

---

## 自定义域名与 HTTPS

在 Amplify 控制台 **Domain management** 中绑定域名；证书与重定向由 Amplify 与 ACM 协同处理（按控制台向导操作即可）。

---

## 生产环境注意事项

1. **无持久化本地磁盘**：Amplify SSR 计算环境不应依赖写入仓库内 JSON 文件作为唯一数据源；多实例或重启会导致数据不一致或丢失。若要做正式多用户/多端部署，需要 **DynamoDB（或同类托管存储）** 等后端持久化（参见项目内产品计划：`visbuild-shopify-aws-saas`）。
2. **定时任务**：不应仅依赖单实例进程内的 `setTimeout` 做生产级定时发布；应使用 **EventBridge Scheduler + Lambda** 等托管调度。
3. **观测**：在 Amplify 控制台查看构建与访问日志；后端 Lambda 等需在 **CloudWatch** 单独配置指标与告警。

---

## 访问控制：整站登录 + 6 小时会话 + 按店铺隔离

- **整站登录**：根加载器（[`app/root.tsx`](app/root.tsx) → `guardRootRequest`）对所有 GET 导航强制要求 Shopify 会话。未登录会跳转 `/auth/shopify/start?next=...`。放行白名单仅限：`/auth/shopify/*`、`/auth/dev-login`、`/api/shopify/webhook`，以及 `ADMIN_AUTH_MODE=legacy` 时的 `/admin/login`。
- **POST 守卫**：因 action 先于 root loader 执行，`/pages`、通配编辑/保存（`*`）、`/api/assets/upload-url` 的 action 内部各自调用 `requireShopSession` / `requireAdmin`。
- **6 小时会话**：`shop_session` cookie 内的签名 payload 携带 `exp`（Unix 秒，TTL = 6 小时）。服务端在 [`shopify-oauth.server.ts`](app/lib/server/shopify-oauth.server.ts) 验签后再校验 `exp`，过期即视为未登录（cookie `Max-Age` 仅作浏览器侧兜底）。超过 6 小时强制重新登录。
- **按店铺隔离**：`/pages` 列表、首页 `/`、通配编辑器读写都以当前会话的 `shopId` 为维度，经 [`page-service.server.ts`](app/lib/server/page-service.server.ts) 调用 `repo.listPagesByShop` / `getPageBody`。A 店铺登录看不到 B 店铺页面。新店铺无首页时 `/` 会重定向到 `/pages`（而非 404）。
- **Shopify 标签页**：`/pages` 的「Shopify」标签用当前店铺 token 经 Admin API 拉取真实页面并按 `shopifyPageGid` 标记是否已导入；无 token 时优雅降级为空列表。
- **`USE_AWS_DATA_LAYER`**：生产置 `true` 走 DynamoDB + Secrets Manager；本地不设则自动用 dev repo（`.dev-data/repo.json`），与生产数据隔离。

### 本地调试入口（dev-login）

仅在 `NODE_ENV !== "production"` 生效（生产返回 404）。免去真实 OAuth，直接下发会话 cookie：

```
/auth/dev-login?shop=devstore.myshopify.com&next=/pages
```

会按 `?shop=` upsert 一个 dev 店铺到 dev repo 并下发 `shop_session`，随后即可在本地增删改页面。

若 `.env.production.local` 中 `SHOPIFY_SHOP_DOMAIN` 与 `SHOPIFY_ACCESS_TOKEN` 与 `?shop=` 一致，dev-login 会写入真实 token，列表「Shopify」标签可拉取线上页面；否则使用占位 token，仅验证本应用内页面流程。

---

## 本地环境验证方案（场景 A，`npm run dev`）

**前置**

1. `.env.production.local` 中设置 `USE_AWS_DATA_LAYER=false`。
2. `Ctrl+C` 后执行 `npm run dev`，确认终端无 `Missing Shopify OAuth env`。
3. 浏览器登录（店铺域名与后续 URL 一致）：

```
http://localhost:5173/auth/dev-login?shop=<你的店>.myshopify.com&next=/pages
```

**页面列表 `/shop/<shop>/pages`**

| 步骤 | 操作 | 预期 |
|------|------|------|
| L1 | 新建页面并进入编辑 | 创建成功，跳转编辑 URL |
| L2 | 行菜单 → **Schedule**，勾选 **Publish page on…**，选未来 1 分钟以上时间 → Save | 状态 **Scheduled**，列表显示定时时间 |
| L3 | 再次打开 Schedule，**取消勾选** → Save | 状态回到 Draft / Outdated 等，定时取消 |
| L4 | 对已发布页再 **Schedule** 并保存 | 可重新变为 Scheduled |
| L5 | 删除 **Scheduled** 行 | 删除成功；到点 **不应** 再触发 Publish（本地为 dev 定时器，删除后 timer 已取消） |
| L6 | Network：保存或定时后 | **不应** 连续刷 `pages.data` / `edit.data` |

**编辑页顶栏 `/shop/<shop>/…/edit`**

| 步骤 | 操作 | 预期 |
|------|------|------|
| E1 | 有未保存改动，非 scheduled / 非 published | 主按钮 **Save** |
| E2 | 保存后（draft） | **Publish** 分裂按钮 +「Schedule publish」 |
| E3 | 已 **Published** 且无未保存改动 | 灰色 **Published** 徽章，不可点 |
| E4 | 已 **Published** 且有未保存改动 | **Save**（非 Published 徽章） |
| E5 | **Scheduled** 且有改动 | 主按钮 **Save**；保存后恢复 **Scheduled** 分裂按钮；到点发布最新已保存内容 |
| E6 | **Edit scheduling** / **Schedule publish** 弹框 | 提示语固定为 *Your page will be published on the day and time you specify.*；勾选才可填时间，默认当前时间；取消勾选并 Confirm 取消定时 |
| E7 | Preview、Publish 等按钮 | 位于顶栏**右侧**，无纵向滚动条 |

**可选（场景 B）**：`USE_AWS_DATA_LAYER=true` + 本机 AWS 凭证，重复 L2/L5，在 DynamoDB 与 CloudWatch 中确认 job 与 Schedule 行为与生产一致。

---

## 线上环境验证方案（场景 D，Amplify 生产）

**前置**

1. 代码已 push 到部署分支，Amplify 构建 **Succeeded**。
2. 控制台环境变量已配置（至少）：`USE_AWS_DATA_LAYER=true`、`SHOPIFY_*`、`SCOPES`、`APP_TABLE_NAME`、`PUBLISH_LAMBDA_ARN`、`SCHEDULE_LAMBDA_ARN`、compute 角色对 Schedule Lambda 的 `lambda:Invoke`。详见 [`PRODUCTION_DEPLOY.md`](PRODUCTION_DEPLOY.md)。
3. Publish / Schedule Lambda 已为 **CJS** 包（见 `npm run verify:lambda-bundle` 与部署脚本）。

**登录与隔离**

| 步骤 | 操作 | 预期 |
|------|------|------|
| P0 | 访问生产 URL，完成 Shopify OAuth | 进入 `/shop/<shop>/pages` |
| P1 | 多标签打开不同 `shop` 的 URL | 页面数据按 URL 店铺隔离，不串店 |
| P2 | 访问 `/auth/dev-login` | **404**（生产后门关闭） |

**功能（与本地表格 L1–L6、E1–E7 相同，在生产域名执行）**

| 重点 | 生产额外确认 |
|------|----------------|
| 定时发布 | Schedule 后 DynamoDB 页面 `status=scheduled`、`pendingJobId` 有值；EventBridge 存在对应 schedule；到点 Publish Lambda 执行成功，Shopify 可见页面 |
| 取消定时 | 列表/编辑弹框取消勾选并保存，或删除 Scheduled 页面前，EventBridge schedule 已删除，job 为 `cancelled` |
| 发布 | **Publish** 立即推 Shopify；已发布再编辑保存为 **Outdated**（列表红色） |
| 构建 | 浏览器 Network 无 `edit.data` / `pages.data` 无限轮询 |

**发布后冒烟（建议顺序）**

1. OAuth 登录 → 新建页 → 保存 → Publish → Shopify Admin 可见页面。
2. Schedule 2–3 分钟后 → 等待 → 刷新 Shopify 与列表状态为 Published。
3. 编辑 Scheduled 页取消勾选定时 → 列表状态恢复非 Scheduled。
4. 删除带定时的页面 → 确认 CloudWatch 无持续失败的 Publish 调用。

**回滚**：Amplify 控制台 Redeploy 上一成功构建，或 Git revert 后重新部署。

---

## Shopify 管理后台（阶段一）

- `/admin/shops` — 店铺与 Access Token
- `/admin/shops/:shopId/pages` — 页面列表与从 Shopify 导入
- `/admin/pages/:pageId` — Puck 编辑器（Save Draft / Publish Now / Schedule Update）

可选环境变量：

| 变量 | 说明 |
|------|------|
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` | Shopify OAuth 登录 |
| `SHOPIFY_APP_URL` | OAuth callback 基准域名（仅 origin） |
| `SCOPES` | OAuth 授权 scope |
| `ADMIN_AUTH_MODE=legacy` | 可选回滚到旧 `ADMIN_API_KEY` 登录 |
| `ADMIN_API_KEY` | 仅 `ADMIN_AUTH_MODE=legacy` 时生效 |
| `USE_AWS_DATA_LAYER` | `true` 时启用 DynamoDB / Secrets Manager / EventBridge |
| `APP_TABLE_NAME` | DynamoDB 表名 |
| `PUBLISH_LAMBDA_ARN` / `SCHEDULER_ROLE_ARN` | Publish Lambda 与 Scheduler 调用角色（后者在 Schedule Lambda 环境内） |
| `SCHEDULE_LAMBDA_ARN` | SSR Invoke，创建 EventBridge 定时任务（生产 `/pages` Schedule 必配） |
| `ASSETS_BUCKET_NAME` | S3 预签上传 |
| `SHOPIFY_WEBHOOK_SECRET` | Webhook HMAC（可选） |

非内嵌 OAuth 入口：

- Start: `/auth/shopify/start`
- Callback: `/auth/shopify/callback`
- 登录成功默认跳转：`/`

基础设施模板见 [`infra/template.yaml`](infra/template.yaml)。

**生产全链路（悉尼区）**：见 [`PRODUCTION_DEPLOY.md`](PRODUCTION_DEPLOY.md)（含五步在 AWS / 本地的详细变化说明；Account `124074140777`，Region `ap-southeast-2`，资源前缀 **visbuild**）。

## 相关文件

- [`amplify.yml`](amplify.yml) — Amplify CI/CD 构建规范  
- [`vite.config.ts`](vite.config.ts) — `amplifyHosting()` 插件  
- [`package.json`](package.json) — `build` / `preview:amplify` 脚本  
