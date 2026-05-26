import { redirect } from "react-router";

import { authenticate } from "~/shopify.server";
import { redirectOAuthOutOfIframe } from "~/lib/shopify-login-redirect.server";

function isRedirectResponse(error: unknown): error is Response {
  return (
    error instanceof Response &&
    [301, 302, 303, 307, 308].includes(error.status)
  );
}

const LOGIN_PATH = "/auth/login";

/** Preserve shop/host/embedded when the library redirects to /auth/login. */
function mergeLoginRedirectLocation(request: Request, location: string): string {
  const target = new URL(location, request.url);
  if (!target.pathname.endsWith(LOGIN_PATH)) {
    return location;
  }

  const source = new URL(request.url);
  for (const key of ["shop", "host", "embedded", "locale"]) {
    const value =
      source.searchParams.get(key) ?? target.searchParams.get(key);
    if (value) {
      target.searchParams.set(key, value);
    }
  }

  return `${target.pathname}${target.search}`;
}

/**
 * Wrapper around authenticate.admin that keeps embedded OAuth params and
 * routes external / OAuth redirects through /auth/exit-iframe.
 */
export async function authenticateAdmin(request: Request) {
  try {
    return await authenticate.admin(request);
  } catch (error) {
    if (!isRedirectResponse(error)) {
      throw error;
    }

    const rawLocation = error.headers.get("Location");
    if (!rawLocation) {
      throw error;
    }

    const location = mergeLoginRedirectLocation(request, rawLocation);
    redirectOAuthOutOfIframe(request, location);
  }
}
