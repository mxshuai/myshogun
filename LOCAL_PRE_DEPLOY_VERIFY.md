# 上线前本地验证（非 Amplify 生产）

在 push / Redeploy 之前，用本机 **production 模式** 连真实 AWS 数据层做冒烟，减少线上反复调试。与 [`AWS_PRODUCTION_DEPLOY.md`](AWS_PRODUCTION_DEPLOY.md) 中的五步生产部署互补。

---

## 本地 vs 生产 各管什么

```
┌──────────────────────────────────────────────────────────────────┐
│ 本地  npm run dev                                                 │
│  • 未设置 USE_AWS_DATA_LAYER → 数据在 .dev-data/*.json（mock）    │
│  • 定时发布 → 进程内 setTimeout（仅本机有效）                      │
│  • 改代码、看页面：http://localhost:5173                          │
│  • 与 AWS 生产数据完全隔离                                        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 生产  Amplify 默认域名（AWS 数据层配置完成后）                     │
│  • USE_AWS_DATA_LAYER=true → DynamoDB + Secrets Manager           │
│  • 定时发布 → EventBridge Scheduler → Lambda → Shopify            │
│  • /admin/* 管理店铺与页面                                        │
└──────────────────────────────────────────────────────────────────┘
```

五步生产部署只影响 **AWS + 你本机执行 AWS CLI 的环境**；不强制改变 `npm run dev` 的数据来源（除非故意设 `USE_AWS_DATA_LAYER=true`）。

---

## 推荐流程

1. 复制环境变量模板（仅本机，勿提交 Git）：

```powershell
copy .env.production.local.example .env.production.local
```

2. 填好 `.env.production.local`（尤其 `ADMIN_API_KEY`、`SCHEDULER_ROLE_ARN`，以及连 AWS 所需的表名与区域）。
3. 启动本地生产模式（会先 build 再 start）：

```powershell
npm run start:local-prod
```

4. 新开终端冒烟：

```powershell
npm run verify:local-admin
```

通过后再 push 触发 Amplify，通常可把线上调试次数降到 1 次。

更多场景对照（dev / 连 AWS / local-prod / Amplify）见 [`DEPLOYMENT.md`](DEPLOYMENT.md)「运行场景与数据层配置对照」。

---

## 方案 C：不经过后台登录，验证写入 Shopify

在 `.env.production.local` 增加（**不要用** `ADMIN_API_KEY` 充当 Shopify Token）：

- `SHOPIFY_SHOP_DOMAIN` — 如 `your-store.myshopify.com`
- `SHOPIFY_ACCESS_TOKEN` — Custom App 的 `shpat_...`（需 `read_content` / `write_content`）
- 可选 `SHOPIFY_PAGE_GID` — 已有页面则填；不填则脚本自动 `pageCreate` 测试页

```powershell
npm run seed:publish-test
```

脚本会：写入 Secrets Manager → 写入 DynamoDB（shop/page/version/schedule/job，`job.kind=publish`）→ 调用 Publish Lambda → 轮询 job 是否 `done`。仅写入不调用 Lambda 时设 `SEED_SKIP_INVOKE=1`。

---

## 升级到版本级 Schedule（清库）

这一版不读取旧的页面级定时数据。部署新 Publish Lambda 和 SSR **之前**清空表内业务数据和残留的 `visbuild-publish-*` schedule：

```powershell
npx tsx scripts/clear-app-data.ts --dry-run --keep-shops
npx tsx scripts/clear-app-data.ts --keep-shops
npm run deploy:publish-lambda
```

`--keep-shops` 保留店铺记录，避免重新 OAuth。  
**仅本地 mock**：`npx tsx scripts/clear-app-data.ts --local`。  
回滚旧 Lambda / 旧 SSR 后需要再次对 **生产 DDB** 清库。

---

## OAuth / 会话回归（含本地项）

生产项见 [`AWS_PRODUCTION_DEPLOY.md`](AWS_PRODUCTION_DEPLOY.md)「OAuth 回归清单」。

**本地专用：**

- 未设 `USE_AWS_DATA_LAYER` 时，经 `/auth/dev-login?shop=...&next=/pages` 可进入并正常增删改页面（`NODE_ENV=production` 下 dev-login 为 404，见 `DEPLOYMENT.md`）。

---

## 相关文件

- [`.env.production.local.example`](.env.production.local.example)
- [`scripts/verify-local-admin.ps1`](scripts/verify-local-admin.ps1)
- [`scripts/start-local-prod.ps1`](scripts/start-local-prod.ps1)
