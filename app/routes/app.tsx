import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";

import type { Route } from "./+types/app";
import { authenticate } from "~/shopify.server";

export async function loader({ request }: Route.LoaderArgs) {
  const apiKey = process.env.SHOPIFY_API_KEY?.trim();
  const apiSecret = process.env.SHOPIFY_API_SECRET?.trim();
  const scopes = process.env.SCOPES?.trim();
  const appUrl = (process.env.SHOPIFY_APP_URL || process.env.HOST || "").trim();

  if (!apiKey || !apiSecret || !scopes || !appUrl) {
    return new Response(
      [
        "Missing required Shopify env vars.",
        `SHOPIFY_API_KEY=${apiKey ? "set" : "missing"}`,
        `SHOPIFY_API_SECRET=${apiSecret ? "set" : "missing"}`,
        `SCOPES=${scopes ? scopes : "missing"}`,
        `SHOPIFY_APP_URL/HOST=${appUrl ? appUrl : "missing"}`,
        "",
        "Amplify -> Hosting -> Environment variables: set these for this branch (or All branches), then redeploy.",
      ].join("\n"),
      { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  await authenticate.admin(request);
  return { apiKey };
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
