import { redirect } from "react-router";

import type { Route } from "./+types/pages";
import { shopPagesPath } from "~/lib/shop-url";
import { getShopSessionFromRequest } from "~/lib/server/shopify-oauth.server";

/** Legacy /pages → shop-scoped URL (cookie only used to pick default shop). */
export async function loader({ request }: Route.LoaderArgs) {
  const session = getShopSessionFromRequest(request);
  if (!session) {
    const url = new URL(request.url);
    throw redirect(
      `/auth/shopify/start?next=${encodeURIComponent(url.pathname + url.search)}`,
    );
  }
  throw redirect(shopPagesPath(session.shopDomain));
}

export default function LegacyPagesRedirect() {
  return null;
}
