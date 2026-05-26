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

const RECOVER_COOKIE = "sb_embed_recover";

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
): void {
  for (const key of EMBEDDED_QUERY_KEYS) {
    const value = source.searchParams.get(key);
    if (value) {
      target.searchParams.set(key, value);
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

function parseCookie(header: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!header) return map;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (!key) continue;
    map.set(key, decodeURIComponent(rest.join("=")));
  }
  return map;
}

/**
 * One-time recovery when /auth/login loads inside Admin without query params.
 * Avoids redirect loops with authenticate.admin.
 */
export function redirectEmbeddedLoginToAppOnce(request: Request): void {
  if (!isEmbeddedAdminContext(request)) {
    return;
  }
  if (hasEmbeddedSessionParams(new URL(request.url))) {
    return;
  }

  const cookies = parseCookie(request.headers.get("Cookie"));
  if (cookies.get(RECOVER_COOKIE) === "1") {
    return;
  }

  const shop = shopFromAdminReferer(request);
  if (!shop) {
    return;
  }

  const params = new URLSearchParams({ shop, embedded: "1" });
  throw redirect(`/app?${params.toString()}`, {
    headers: {
      "Set-Cookie": `${RECOVER_COOKIE}=1; Path=/; Max-Age=120; HttpOnly; SameSite=None; Secure`,
    },
  });
}
