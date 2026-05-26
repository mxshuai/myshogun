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

/**
 * OAuth / Admin install URLs must not load inside the Shopify Admin iframe.
 * @see redirectOutOfApp in @shopify/shopify-app-react-router billing helpers
 */
export function redirectOAuthOutOfIframe(
  request: Request,
  destination: string,
): never {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const host = url.searchParams.get("host");
  const isEmbedded = url.searchParams.get("embedded") === "1";

  if (!isEmbedded || !shop || !host) {
    throw redirect(destination);
  }

  let destUrl: URL;
  try {
    destUrl = new URL(destination);
  } catch {
    throw redirect(destination);
  }

  const origin = appOrigin();
  if (origin && destUrl.origin === origin) {
    throw redirect(destination);
  }

  const params = new URLSearchParams({ shop, host, exitIframe: destination });
  throw redirect(`/auth/exit-iframe?${params.toString()}`);
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
