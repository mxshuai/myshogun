import type { Route } from "./+types/auth.shopify.callback";
import { ensureServerContext } from "~/lib/server/factory";
import { completeShopifyOAuth } from "~/lib/server/shopify-oauth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await ensureServerContext();
  return completeShopifyOAuth(request, ctx);
}

export default function ShopifyAuthCallbackRoute() {
  return null;
}
