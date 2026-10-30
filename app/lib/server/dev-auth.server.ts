/** Placeholder token written by /auth/dev-login when no real SHOPIFY_ACCESS_TOKEN applies. */
export const DEV_LOCAL_SHOP_TOKEN = "dev-local-token";

export function isDevPlaceholderShopToken(
  token: string | null | undefined,
): boolean {
  return token === DEV_LOCAL_SHOP_TOKEN;
}
