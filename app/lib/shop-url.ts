/** URL helpers for shop-scoped routes (safe for client + server). */

export function encodeShopDomainParam(domain: string): string {
  return encodeURIComponent(domain.trim());
}

export function decodeShopDomainParam(param: string): string {
  return decodeURIComponent(param);
}

/** `/shop/:shopDomain/...` → domain, or null. */
export function shopDomainFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/shop\/([^/]+)/);
  if (!match) return null;
  try {
    return decodeShopDomainParam(match[1]);
  } catch {
    return null;
  }
}

export function devLoginUrl(shopDomain: string | null, next: string): string {
  const params = new URLSearchParams();
  if (shopDomain) params.set("shop", shopDomain);
  params.set("next", next);
  return `/auth/dev-login?${params.toString()}`;
}

export function shopBasePath(domain: string): string {
  return `/shop/${encodeShopDomainParam(domain)}`;
}

export function shopPagesPath(domain: string): string {
  return `${shopBasePath(domain)}/pages`;
}

export function shopEditPath(domain: string, pagePath: string): string {
  const base = shopBasePath(domain);
  return pagePath === "/" ? `${base}/edit` : `${base}${pagePath}/edit`;
}

export function shopPublicPath(domain: string, pagePath: string): string {
  const base = shopBasePath(domain);
  return pagePath === "/" ? `${base}/` : `${base}${pagePath}`;
}

/** After OAuth or legacy /pages, /edit links without /shop/ prefix. */
export function resolvePostAuthNext(next: string, shopDomain: string): string {
  const trimmed = next.trim();
  if (
    trimmed === "/" ||
    trimmed === "/pages" ||
    trimmed.startsWith("/pages?")
  ) {
    return shopPagesPath(shopDomain);
  }
  if (
    trimmed.startsWith("/edit") ||
    trimmed === "/edit" ||
    (!trimmed.startsWith("/shop/") &&
      !trimmed.startsWith("/admin") &&
      !trimmed.startsWith("/auth") &&
      !trimmed.startsWith("/api"))
  ) {
    const domainEnc = encodeShopDomainParam(shopDomain);
    if (trimmed === "/edit" || trimmed.startsWith("/edit?")) {
      return `/shop/${domainEnc}/edit${trimmed.slice(5)}`;
    }
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      return `/shop/${domainEnc}${trimmed}`;
    }
  }
  return trimmed.startsWith("/") && !trimmed.startsWith("//")
    ? trimmed
    : shopPagesPath(shopDomain);
}
