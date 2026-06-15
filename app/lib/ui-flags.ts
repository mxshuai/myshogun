/** 临时隐藏 Shopify Admin 按钮、Connect another shop、Pages 的 Shogun/Shopify 标签 */
export const HIDE_SHOPIFY_ADMIN_UI = true;

/** 店铺切换下拉里不展示的 domain（仍可通过 URL 直接访问） */
const HIDDEN_SHOP_SWITCHER_DOMAINS = new Set([
  "mxshuaitest2.myshopify.com",
  "mxstest1.myshopify.com",
]);

export function isShopHiddenFromSwitcher(domain: string): boolean {
  return HIDDEN_SHOP_SWITCHER_DOMAINS.has(domain.trim().toLowerCase());
}
