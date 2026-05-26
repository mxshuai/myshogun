import { authenticate } from "~/shopify.server";
import {
  isEmbeddedAdminContext,
  mergeShopifyQueryParams,
} from "~/lib/shopify-embedded-context.server";
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

  mergeShopifyQueryParams(target, new URL(request.url));

  if (
    isEmbeddedAdminContext(request) &&
    !target.searchParams.has("embedded")
  ) {
    target.searchParams.set("embedded", "1");
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
