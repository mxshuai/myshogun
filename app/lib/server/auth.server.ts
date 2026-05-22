import { redirect } from "react-router";

import { getAdminApiKey } from "./env";

const COOKIE_NAME = "admin_key";

export function requireAdmin(request: Request): void {
  const expected = getAdminApiKey();
  if (!expected) return;

  const header = request.headers.get("X-Admin-Key");
  const cookie = parseCookie(request.headers.get("Cookie")).get(COOKIE_NAME);
  if (header === expected || cookie === expected) return;

  const url = new URL(request.url);
  if (url.pathname === "/admin/login") return;

  throw redirect(`/admin/login?next=${encodeURIComponent(url.pathname + url.search)}`);
}

export function adminLoginResponse(apiKey: string, next: string): Response {
  const expected = getAdminApiKey();
  const safeNext = next.startsWith("/admin") ? next : "/admin/shops";
  // 与 requireAdmin 行为保持一致：未配置 ADMIN_API_KEY 时关闭鉴权，允许直接进入管理页。
  if (!expected) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: safeNext,
      },
    });
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

function parseCookie(header: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!header) return map;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k) map.set(k, decodeURIComponent(rest.join("=")));
  }
  return map;
}
