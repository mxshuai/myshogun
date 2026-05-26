import { redirect } from "react-router";

import {
  isEmbeddedAdminContext,
} from "~/lib/shopify-embedded-context.server";

function isRedirectResponse(error: unknown): error is Response {
  return (
    error instanceof Response &&
    [301, 302, 303, 307, 308].includes(error.status)
  );
}

function appOrigin(): string {
  const raw = process.env.SHOPIFY_APP_URL || process.env.HOST || "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

/** Break out of Admin iframe when host param is missing (e.g. manual login form POST). */
export function redirectTopLevelHtml(destination: string): never {
  throw new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>window.top.location.href=${JSON.stringify(destination)}</script></body></html>`,
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

function shouldBreakOutOfIframe(
  request: Request,
  destUrl: URL,
  appOriginValue: string,
): boolean {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop) {
    return false;
  }

  const isExternal =
    !appOriginValue || destUrl.origin !== appOriginValue;
  const isAuthRoute =
    destUrl.pathname === "/auth" || destUrl.pathname.startsWith("/auth/");

  return isExternal || isAuthRoute;
}

/**
 * OAuth / Admin install URLs must not load inside the Shopify Admin iframe.
 * @see redirectOutOfApp in @shopify/shopify-app-react-router billing helpers
 */
export function redirectOAuthOutOfIframe(
  request: Request,
  destination: string,
): never {
  const url = new URL(request.url);

  let destUrl: URL;
  try {
    destUrl = new URL(destination, url.origin);
  } catch {
    throw redirect(destination);
  }

  if (!shouldBreakOutOfIframe(request, destUrl, appOrigin())) {
    throw redirect(destination);
  }

  const shop = url.searchParams.get("shop")!;
  const host = url.searchParams.get("host");

  if (host) {
    const params = new URLSearchParams({
      shop,
      host,
      exitIframe: destUrl.toString(),
    });
    throw redirect(`/auth/exit-iframe?${params.toString()}`);
  }

  if (isEmbeddedAdminContext(request)) {
    redirectTopLevelHtml(destUrl.toString());
  }

  throw redirect(destination);
}

export async function loginWithEmbeddedExitIframe(
  request: Request,
  loginFn: (request: Request) => Promise<unknown>,
): Promise<unknown> {
  try {
    return await loginFn(request);
  } catch (error) {
    if (isRedirectResponse(error)) {
      const location = error.headers.get("Location");
      if (location) {
        redirectOAuthOutOfIframe(request, location);
      }
    }
    throw error;
  }
}
