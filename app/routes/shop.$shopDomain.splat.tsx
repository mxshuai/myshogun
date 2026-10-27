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

/**
 * After a rename, revalidating the old URL 404s before the client navigates.
 * Skip revalidation only when the action reports an actual path change.
 */
export function shouldRevalidate({
  actionResult,
  defaultShouldRevalidate,
}: {
  actionResult: unknown;
  defaultShouldRevalidate: boolean;
}) {
  if (
    actionResult &&
    typeof actionResult === "object" &&
    "ok" in actionResult &&
    (actionResult as { ok?: boolean }).ok === true &&
    (actionResult as { renamed?: boolean }).renamed === true
  ) {
    return false;
  }
  return defaultShouldRevalidate;
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
