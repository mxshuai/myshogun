import type { Route } from "./+types/_index";
import { VisbuildRender } from "~/components/visbuild-render";
import { resolveVisbuildPath } from "~/lib/resolve-visbuild-path.server";
import { getPage } from "~/lib/pages.server";

export async function loader() {
  const { isEditorRoute, path } = resolveVisbuildPath("/");
  let page = await getPage(path);

  if (!page) {
    throw new Response("Not Found", { status: 404 });
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
