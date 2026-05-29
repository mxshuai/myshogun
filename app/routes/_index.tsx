import { redirect } from "react-router";

import type { Route } from "./+types/_index";
import { VisbuildRender } from "~/components/visbuild-render";
import { resolveVisbuildPath } from "~/lib/resolve-visbuild-path.server";
import { requireShopSession } from "~/lib/server/auth.server";
import { ensureServerContext } from "~/lib/server/factory";
import { getPageDataByPath } from "~/lib/server/page-service.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = requireShopSession(request);
  const { isEditorRoute, path } = resolveVisbuildPath("/");
  const ctx = await ensureServerContext();
  const page = await getPageDataByPath(ctx, session.shopId, path);

  // New shop without a home page yet: send them to the pages list instead of 404.
  if (!page) {
    throw redirect("/pages");
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

export default function VisbuildIndexRoute({ loaderData }: Route.ComponentProps) {
  return <VisbuildRender data={loaderData.data} />;
}
