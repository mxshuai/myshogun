# Shopify 嵌入式 App（路径 A）

## Partners 配置

| 项 | 值 |
|----|-----|
| App URL | `https://<amplify-domain>/app` |
| Redirect URL | `https://<amplify-domain>/auth/callback` |
| Embedded | 开启 |
| Scopes | `read_content`, `write_content` |

## Amplify 环境变量

```
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SCOPES=read_content,write_content
SHOPIFY_APP_URL=https://master.d3w458ytk16hpm.amplifyapp.com
```

保留现有 AWS 变量（`USE_AWS_DATA_LAYER`、`APP_TABLE_NAME` 等）。

## 本地开发

1. 复制 `.env.production.local.example` → `.env.production.local` 并填写 Shopify 凭据
2. 使用 [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) 或 `shopify app dev` 暴露 HTTPS
3. Partners 中 App URL / Redirect URL 指向 tunnel 地址
4. `npm run dev` 或 `npm run start:local-prod`

## 安装测试

Partners → App → Select development store → Install app

安装后从 Shopify Admin → Apps 进入，路由为 `/app/pages`。

## 路由说明

| 路由 | 说明 |
|------|------|
| `/auth/*` | OAuth 安装/回调 |
| `/app/pages` | 页面列表（嵌入式） |
| `/app/pages/:pageId` | Puck 编辑器 |
| `/webhooks/app/uninstalled` | 卸载清理 |
| `/webhooks/pages/update` | Shopify 页面变更同步 |

旧版 `/admin/*` 路由已移除，请使用嵌入式 App 入口。
