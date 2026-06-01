import { redirect } from "react-router";

import type { Route } from "./+types/shop.$shopDomain._index";
import { VisbuildRender } from "~/components/visbuild-render";
import { resolveVisbuildPath } from "~/lib/resolve-visbuild-path.server";
import { shopPagesPath } from "~/lib/shop-url";
import { ensureServerContext } from "~/lib/server/factory";
import { getPageDataByPath } from "~/lib/server/page-service.server";
import { requireShopRouteContext } from "~/lib/server/shop-route.server";

export async function loader({ params, request }: Route.LoaderArgs) {
  const ctx = await ensureServerContext();
  const { shop } = await requireShopRouteContext(
    request,
    params.shopDomain ?? "",
    ctx,
  );
  const { isEditorRoute, path } = resolveVisbuildPath("/");
  const page = await getPageDataByPath(ctx, shop.id, path);

  if (!page) {
    throw redirect(shopPagesPath(shop.domain));
  }

  return {
    isEditorRoute,
    path,
    data: page,
  };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  return [
    {
      title: loaderData.data.root.props?.title ?? "",
    },
  ];
}

export default function ShopHomeRoute({ loaderData }: Route.ComponentProps) {
  return <VisbuildRender data={loaderData.data} />;
}
