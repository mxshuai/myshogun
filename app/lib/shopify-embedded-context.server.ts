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
