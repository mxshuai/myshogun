import type { RouteConfig } from "@react-router/dev/routes";
import { index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("auth/*", "routes/auth.$.tsx"),
  route("app", "routes/app.tsx", [
    index("routes/app._index.tsx"),
    route("pages", "routes/app.pages.tsx"),
    route("pages/:pageId", "routes/app.pages.$pageId.tsx"),
  ]),
  route("webhooks/app/uninstalled", "routes/webhooks.app.uninstalled.tsx"),
  route("webhooks/pages/update", "routes/webhooks.pages.update.tsx"),
  route("api/assets/upload-url", "routes/api.assets.upload-url.tsx"),
  route("*", "routes/visbuild-splat.tsx"),
] satisfies RouteConfig;
