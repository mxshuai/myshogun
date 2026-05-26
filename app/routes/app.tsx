import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";

import type { Route } from "./+types/app";
import { authenticateAdmin } from "~/lib/shopify-authenticate.server";
import { redirectToEmbeddedAppEntry } from "~/lib/shopify-embedded-context.server";

export async function loader({ request }: Route.LoaderArgs) {
  redirectToEmbeddedAppEntry(request);
  await authenticateAdmin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
}

export default function AppLayout() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <NavMenu>
        <Link to="/app/pages" rel="home">
          Pages
        </Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
