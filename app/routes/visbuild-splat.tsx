import { redirect } from "react-router";

import type { Route } from "./+types/visbuild-splat";
import { decodePathname } from "~/lib/page-path";
import { resolveVisbuildPath } from "~/lib/resolve-visbuild-path.server";
import { shopEditPath, shopPublicPath } from "~/lib/shop-url";
import { getShopSessionFromRequest } from "~/lib/server/shopify-oauth.server";

/** Legacy /* paths → /shop/:shopDomain/... */
export async function loader({ request }: Route.LoaderArgs) {
  const session = getShopSessionFromRequest(request);
  const { isEditorRoute, path } = resolveVisbuildPath(
    decodePathname(new URL(request.url).pathname),
  );

  if (!session) {
    const url = new URL(request.url);
    throw redirect(
      `/auth/shopify/start?next=${encodeURIComponent(url.pathname + url.search)}`,
    );
  }

  throw redirect(
    isEditorRoute
      ? shopEditPath(session.shopDomain, path)
      : shopPublicPath(session.shopDomain, path),
  );
}

export default function LegacyVisbuildSplatRedirect() {
  return null;
}
