import { redirect } from "react-router";

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

function isExternalUrl(destination: string, request: Request): boolean {
  const origin = appOrigin();
  if (!origin) {
    return false;
  }
  try {
    return new URL(destination, request.url).origin !== origin;
  } catch {
    return false;
  }
}

/**
 * OAuth / Admin install URLs must not load inside the Shopify Admin iframe.
 * Same-origin /auth/* redirects are handled by shopify-app-react-router.
 */
export function redirectOAuthOutOfIframe(
  request: Request,
  destination: string,
): never {
  if (!isExternalUrl(destination, request)) {
    throw redirect(destination);
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const host = url.searchParams.get("host");

  if (shop && host) {
    const params = new URLSearchParams({
      shop,
      host,
      exitIframe: new URL(destination, request.url).toString(),
    });
    throw redirect(`/auth/exit-iframe?${params.toString()}`);
  }

  if (shop) {
    redirectTopLevelHtml(new URL(destination, request.url).toString());
  }

  throw redirect(destination);
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
