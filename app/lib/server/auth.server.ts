import { redirect } from "react-router";

import { devLoginUrl, shopDomainFromPathname } from "~/lib/shop-url";
import { getAdminApiKey, isProductionRuntime } from "./env";
import {
  clearShopSessionCookie,
  getShopSessionFromRequest,
} from "./shopify-oauth.server";

const COOKIE_NAME = "admin_key";

function useLegacyAdminAuth(): boolean {
  return process.env.ADMIN_AUTH_MODE?.trim().toLowerCase() === "legacy";
}

export function requireShopSession(request: Request) {
  const session = getShopSessionFromRequest(request);
  if (!session) {
    const url = safeParseUrl(request);
    const next = url.pathname + url.search;
    if (!isProductionRuntime()) {
      throw redirect(
        devLoginUrl(shopDomainFromPathname(url.pathname), next),
      );
    }
    throw redirect(`/auth/shopify/start?next=${encodeURIComponent(next)}`);
  }
  return session;
}

/**
 * Paths that must stay reachable without a shop session so that the login
 * handshake itself and Shopify-originated callbacks can complete.
 */
const PUBLIC_PATH_PREFIXES = [
  "/auth/shopify/",
  "/auth/dev-login",
  "/api/shopify/webhook",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return true;
  }
  // Legacy admin login page stays open only when legacy auth is enabled.
  if (useLegacyAdminAuth() && pathname === "/admin/login") return true;
  return false;
}

/**
 * Site-wide guard for GET navigations. Applied from the root loader so every
 * route requires a Shopify session except the explicit allowlist above.
 */
export function guardRootRequest(request: Request) {
  const url = safeParseUrl(request);
  if (isPublicPath(url.pathname)) return;
  requireShopSession(request);
}

export function requireAdmin(request: Request) {
  if (!useLegacyAdminAuth()) {
    return requireShopSession(request);
  }

  const expected = getAdminApiKey();
  if (!expected) {
    const url = safeParseUrl(request);
    throw redirect(
      `/auth/shopify/start?next=${encodeURIComponent(url.pathname + url.search)}`,
    );
  }

  const header = request.headers.get("X-Admin-Key");
  const cookie = parseCookie(request.headers.get("Cookie")).get(COOKIE_NAME);
  if (header === expected || cookie === expected) return;

  const url = safeParseUrl(request);
  if (url.pathname === "/admin/login") return;

  throw redirect(`/admin/login?next=${encodeURIComponent(url.pathname + url.search)}`);
}

export function adminLoginResponse(apiKey: string, next: string): Response {
  if (!useLegacyAdminAuth()) {
    return redirect(
      `/auth/shopify/start?next=${encodeURIComponent(next || "/admin/shops")}`,
    );
  }

  const expected = getAdminApiKey();
  const safeNext = next.startsWith("/admin") ? next : "/admin/shops";
  // 与 requireAdmin 行为保持一致：未配置 ADMIN_API_KEY 时关闭鉴权，允许直接进入管理页。
  if (!expected) {
    return redirect(`/auth/shopify/start?next=${encodeURIComponent(safeNext)}`);
  }
  if (apiKey !== expected) {
    return new Response("Invalid key", { status: 401 });
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: safeNext,
      "Set-Cookie": `${COOKIE_NAME}=${encodeURIComponent(apiKey)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    },
  });
}

export function clearAuthCookies(): Headers {
  const headers = new Headers();
  const secure = isProductionRuntime() ? "; Secure" : "";
  headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  );
  headers.append("Set-Cookie", clearShopSessionCookie());
  return headers;
}

function parseCookie(header: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!header) return map;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    const raw = rest.join("=");
    try {
      map.set(k, decodeURIComponent(raw));
    } catch {
      // 忽略非法 cookie 编码，避免鉴权阶段抛 500
      map.set(k, raw);
    }
  }
  return map;
}

function safeParseUrl(request: Request): URL {
  try {
    return new URL(request.url);
  } catch {
    const host = request.headers.get("host") || "localhost";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return new URL(request.url, `${proto}://${host}`);
  }
}
