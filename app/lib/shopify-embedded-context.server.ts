import { redirect } from "react-router";

/** Query params Shopify sends for embedded Admin apps. */
export const EMBEDDED_QUERY_KEYS = [
  "shop",
  "host",
  "embedded",
  "locale",
  "session",
  "id_token",
] as const;

export function isEmbeddedAdminContext(request: Request): boolean {
  const url = new URL(request.url);
  if (url.searchParams.get("embedded") === "1") {
    return true;
  }
  const referer = request.headers.get("Referer") ?? "";
  return (
    referer.includes("admin.shopify.com") ||
    referer.includes(".myshopify.com/admin")
  );
}

export function mergeShopifyQueryParams(
  target: URL,
  source: URL,
): void;
export function mergeShopifyQueryParams(
  target: URLSearchParams,
  source: URL,
): void;
export function mergeShopifyQueryParams(
  target: URL | URLSearchParams,
  source: URL,
): void {
  for (const key of EMBEDDED_QUERY_KEYS) {
    const value = source.searchParams.get(key);
    if (!value) continue;
    if (target instanceof URL) {
      target.searchParams.set(key, value);
    } else {
      target.set(key, value);
    }
  }
}

export function hasEmbeddedSessionParams(url: URL): boolean {
  return Boolean(url.searchParams.get("shop") && url.searchParams.get("host"));
}

/** e.g. Referer https://admin.shopify.com/store/mxshuaitest1/apps/foo */
export function shopFromAdminReferer(request: Request): string | null {
  const referer = request.headers.get("Referer") ?? "";
  const match = referer.match(/admin\.shopify\.com\/store\/([^/?#]+)/i);
  if (!match?.[1]) {
    return null;
  }
  const storeHandle = match[1].toLowerCase();
  if (storeHandle.endsWith(".myshopify.com")) {
    return storeHandle;
  }
  return `${storeHandle}.myshopify.com`;
}

/**
 * When Admin iframe lands on /auth/login without Shopify query params,
 * send the user to /app so the library can call getEmbeddedAppUrl().
 */
export function redirectEmbeddedLoginToApp(request: Request): void {
  if (!isEmbeddedAdminContext(request)) {
    return;
  }
  if (hasEmbeddedSessionParams(new URL(request.url))) {
    return;
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") ?? shopFromAdminReferer(request);
  if (!shop) {
    return;
  }

  const params = new URLSearchParams({ shop });
  mergeShopifyQueryParams(params, url);
  throw redirect(`/app?${params.toString()}`);
}
