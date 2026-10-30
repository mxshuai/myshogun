import { redirect } from "react-router";

import type { Route } from "./+types/_index";
import { shopPublicPath } from "~/lib/shop-url";
import { getShopSessionFromRequest } from "~/lib/server/shopify-oauth.server";

/** Legacy / → shop home or pages list for session shop. */
export async function loader({ request }: Route.LoaderArgs) {
  const session = getShopSessionFromRequest(request);
  if (!session) {
    throw redirect("/auth/shopify/start?next=/");
  }
  throw redirect(shopPublicPath(session.shopDomain, "/"));
}

export default function LegacyIndexRedirect() {
  return null;
}
