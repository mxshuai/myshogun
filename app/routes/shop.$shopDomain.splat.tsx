import type { Route } from "./+types/shop.$shopDomain.splat";
import { ShopPageEditor } from "~/components/editor/ShopPageEditor";
import { ShopPagePublic } from "~/components/editor/ShopPagePublic";

export async function loader(args: Route.LoaderArgs) {
  const { loader: runLoader } = await import("./shop.$shopDomain.splat.server");
  return runLoader(args);
}

export async function action(args: Route.ActionArgs) {
  const { action: runAction } = await import("./shop.$shopDomain.splat.server");
  return runAction(args);
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  return [
    {
      title: loaderData.isEditorRoute
        ? `Edit: ${loaderData.path}`
        : loaderData.data.root.props?.title ?? "",
    },
  ];
}

export default function ShopVisbuildSplatRoute({
  loaderData,
}: Route.ComponentProps) {
  if (loaderData.isEditorRoute) {
    return (
      <ShopPageEditor
        shopDomain={loaderData.shopDomain}
        path={loaderData.path}
        initialData={loaderData.data}
        initialPageMeta={loaderData.pageMeta}
      />
    );
  }
  return <ShopPagePublic data={loaderData.data} />;
}
