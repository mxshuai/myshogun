import type { RouteConfig } from "@react-router/dev/routes";
import { route, index } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("auth/shopify/start", "routes/auth.shopify.start.tsx"),
  route("auth/shopify/callback", "routes/auth.shopify.callback.tsx"),
  route("auth/dev-login", "routes/auth.dev-login.tsx"),
  route("pages", "routes/pages.tsx"),
  route("admin/login", "routes/admin.login.tsx"),
  route("admin/shops", "routes/admin.shops.tsx"),
  route("admin/shops/:shopId/pages", "routes/admin.shops.$shopId.pages.tsx"),
  route("admin/pages/:pageId", "routes/admin.pages.$pageId.tsx"),
  route("api/assets/upload-url", "routes/api.assets.upload-url.tsx"),
  route("api/shopify/webhook", "routes/api.shopify.webhook.tsx"),
  route("*", "routes/visbuild-splat.tsx"),
] satisfies RouteConfig;
