import type { RouteConfig } from "@react-router/dev/routes";
import { index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("auth/login", "routes/auth.login.tsx"),
  route("auth/*", "routes/auth.$.tsx"),
  route("app", "routes/app.tsx", [
    index("routes/app._index.tsx"),
    route("pages", "routes/app.pages.tsx"),
    route("pages/:pageId", "routes/app.pages.$pageId.tsx"),
  ]),
  route("webhooks/app/uninstalled", "routes/webhooks.app.uninstalled.tsx"),
  route("webhooks/app/scopes_update", "routes/webhooks.app.scopes_update.tsx"),
  route("api/assets/upload-url", "routes/api.assets.upload-url.tsx"),
  route("*", "routes/visbuild-splat.tsx"),
] satisfies RouteConfig;
