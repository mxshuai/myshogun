import { Outlet, useLoaderData } from "react-router";

import type { Route } from "./+types/shop.$shopDomain";
import { ShopAppHeader } from "~/components/ShopAppHeader";
import { ensureServerContext } from "~/lib/server/factory";
import { requireShopRouteContext } from "~/lib/server/shop-route.server";
import { isShopHiddenFromSwitcher } from "~/lib/ui-flags";

export async function loader({ params, request }: Route.LoaderArgs) {
  const ctx = await ensureServerContext();
  const { shop } = await requireShopRouteContext(
    request,
    params.shopDomain ?? "",
    ctx,
  );

  const all = await ctx.repo.listShops();
  const shops: { domain: string; name: string }[] = [];
  for (const s of all) {
    if (isShopHiddenFromSwitcher(s.domain)) continue;
    if (await ctx.secrets.getShopToken(s.id)) {
      shops.push({ domain: s.domain, name: s.name });
    }
  }
  if (
    !isShopHiddenFromSwitcher(shop.domain) &&
    !shops.some((s) => s.domain === shop.domain)
  ) {
    shops.unshift({ domain: shop.domain, name: shop.name });
  }

  return { shopDomain: shop.domain, shopName: shop.name, shops };
}

export default function ShopDomainLayout() {
  const { shopDomain, shops } = useLoaderData<typeof loader>();

  return (
    <>
      <ShopAppHeader currentDomain={shopDomain} shops={shops} />
      <Outlet />
    </>
  );
}
