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
  if (
    referer.includes("admin.shopify.com") ||
    referer.includes(".myshopify.com/admin")
  ) {
    return true;
  }

  const secFetchDest = request.headers.get("Sec-Fetch-Dest");
  const secFetchSite = request.headers.get("Sec-Fetch-Site");
  if (secFetchDest === "iframe" && secFetchSite === "cross-site") {
    return true;
  }

  return false;
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

/** Shopify `host` query param: base64("admin.shopify.com/store/{handle}"). */
export function hostParamFromShop(shop: string): string {
  const handle = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const storeHandle = handle.endsWith(".myshopify.com")
    ? handle.slice(0, -".myshopify.com".length)
    : handle;
  const adminPath = `admin.shopify.com/store/${storeHandle}`;
  return Buffer.from(adminPath, "utf8").toString("base64");
}

function appOrigin(): string {
  const raw = process.env.SHOPIFY_APP_URL || process.env.HOST || "";
  return raw.replace(/\/$/, "");
}

/**
 * Build /app?shop=&host=&embedded=1 when Shopify iframe omits query params.
 */
export function buildEmbeddedAppEntryPath(request: Request): string | null {
  const url = new URL(request.url);
  const shop =
    url.searchParams.get("shop") ?? shopFromAdminReferer(request);
  if (!shop) {
    return null;
  }

  const origin = appOrigin();
  if (!origin) {
    return null;
  }

  const params = new URLSearchParams(url.searchParams);
  params.set("shop", shop);
  if (!params.get("host")) {
    params.set("host", hostParamFromShop(shop));
  }
  if (!params.get("embedded")) {
    params.set("embedded", "1");
  }

  return `/app?${params.toString()}`;
}

export function redirectToEmbeddedAppEntry(request: Request): void {
  if (hasEmbeddedSessionParams(new URL(request.url))) {
    return;
  }

  const path = buildEmbeddedAppEntryPath(request);
  if (!path) {
    return;
  }

  throw redirect(path);
}

/**
 * When Admin iframe lands on /auth/login without Shopify query params.
 */
export function redirectEmbeddedLoginToApp(request: Request): void {
  if (!isEmbeddedAdminContext(request)) {
    return;
  }
  redirectToEmbeddedAppEntry(request);
}
