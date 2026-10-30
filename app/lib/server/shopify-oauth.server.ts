import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { redirect } from "react-router";

import "~/lib/load-production-env.server";
import { isProductionRuntime } from "./env";
import { resolvePostAuthNext } from "~/lib/shop-url";
import { normalizeShopDomain, upsertShopRecord } from "./page-ops";
import { createAdminClient } from "./shopify";
import type { ServerContext } from "./types";

const OAUTH_STATE_COOKIE = "shopify_oauth_state";
const SHOP_SESSION_COOKIE = "shop_session";
const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const SHOP_SESSION_TTL_SECONDS = 6 * 60 * 60;

/**
 * Local-only fallback so the dev-login shortcut can sign sessions without a
 * real Shopify secret. Production never uses this: there the real
 * SHOPIFY_API_SECRET is always required.
 */
const DEV_SESSION_SECRET = "dev-insecure-shop-session-secret";

function resolveSessionSecret(): string {
  const secret = process.env.SHOPIFY_API_SECRET?.trim();
  if (secret) return secret;
  // Only fall back to the insecure dev secret in a true local environment.
  if (!isProductionRuntime()) return DEV_SESSION_SECRET;
  return "";
}

type OAuthStatePayload = {
  nonce: string;
  next: string;
  issuedAt: number;
};

export type ShopSession = {
  shopId: string;
  shopDomain: string;
  /** Unix epoch seconds when this session must be re-authenticated. */
  exp: number;
};

type ShopifyOAuthConfig = {
  apiKey: string;
  apiSecret: string;
  appUrlOrigin: string;
  scopes: string;
};

function requireShopifyOAuthConfig(): ShopifyOAuthConfig {
  const apiKey = process.env.SHOPIFY_API_KEY?.trim() ?? "";
  const apiSecret = process.env.SHOPIFY_API_SECRET?.trim() ?? "";
  const scopes = process.env.SCOPES?.trim() ?? "";
  const appUrlRaw =
    process.env.SHOPIFY_APP_URL?.trim() || process.env.HOST?.trim() || "";

  if (!apiKey || !apiSecret || !scopes || !appUrlRaw) {
    throw new Error(
      "Missing Shopify OAuth env. Required: SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SCOPES, SHOPIFY_APP_URL/HOST.",
    );
  }

  let appUrlOrigin: string;
  try {
    appUrlOrigin = new URL(appUrlRaw).origin;
  } catch {
    throw new Error("SHOPIFY_APP_URL/HOST must be a valid absolute URL.");
  }

  return { apiKey, apiSecret, appUrlOrigin, scopes };
}

function buildCookie(name: string, value: string, maxAgeSeconds: number): string {
  const isProd = isProductionRuntime();
  const sameSite = isProd ? "None" : "Lax";
  const secure = isProd ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAgeSeconds}${secure}`;
}

function clearCookie(name: string): string {
  const isProd = isProductionRuntime();
  const sameSite = isProd ? "None" : "Lax";
  const secure = isProd ? "; Secure" : "";
  return `${name}=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0${secure}`;
}

function parseCookie(header: string | null): Map<string, string> {
  const map = new Map<string, string>();
  if (!header) return map;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (!key) continue;
    const raw = rest.join("=");
    try {
      map.set(key, decodeURIComponent(raw));
    } catch {
      map.set(key, raw);
    }
  }
  return map;
}

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function signWithSecret(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function serializeState(payload: OAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function deserializeState(encoded: string): OAuthStatePayload | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as OAuthStatePayload;
    if (!parsed.nonce || !parsed.next || !parsed.issuedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function sanitizeNext(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

export function getShopSessionFromRequest(request: Request): ShopSession | null {
  const cookies = parseCookie(request.headers.get("Cookie"));
  const value = cookies.get(SHOP_SESSION_COOKIE);
  if (!value) return null;

  const [payloadEncoded, signature] = value.split(".");
  if (!payloadEncoded || !signature) return null;

  const secret = resolveSessionSecret();
  if (!secret) return null;

  const expectedSignature = signWithSecret(payloadEncoded, secret);
  if (!safeCompare(signature, expectedSignature)) return null;

  try {
    const payloadJson = Buffer.from(payloadEncoded, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as ShopSession;
    if (!payload.shopId || !payload.shopDomain) return null;
    // Server-side expiry: cookie Max-Age alone is client-controlled, so the
    // signed payload carries the authoritative expiry timestamp.
    if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function setShopSessionCookie(
  session: Pick<ShopSession, "shopId" | "shopDomain">,
): string {
  const secret = resolveSessionSecret();
  if (!secret) throw new Error("SHOPIFY_API_SECRET is required to sign shop session.");

  const fullSession: ShopSession = {
    shopId: session.shopId,
    shopDomain: session.shopDomain,
    exp: Math.floor(Date.now() / 1000) + SHOP_SESSION_TTL_SECONDS,
  };
  const payloadEncoded = Buffer.from(JSON.stringify(fullSession), "utf8").toString(
    "base64url",
  );
  const signature = signWithSecret(payloadEncoded, secret);
  return buildCookie(
    SHOP_SESSION_COOKIE,
    `${payloadEncoded}.${signature}`,
    SHOP_SESSION_TTL_SECONDS,
  );
}

export function clearShopSessionCookie(): string {
  return clearCookie(SHOP_SESSION_COOKIE);
}

export function beginShopifyOAuth(request: Request, shopRaw: string, next?: string): Response {
  const { apiKey, appUrlOrigin, scopes } = requireShopifyOAuthConfig();
  const shop = normalizeShopDomain(shopRaw);

  const url = new URL(request.url);
  const resolvedNext = sanitizeNext(next ?? url.searchParams.get("next"));
  const statePayload: OAuthStatePayload = {
    nonce: randomBytes(16).toString("hex"),
    next: resolvedNext,
    issuedAt: Date.now(),
  };
  const state = serializeState(statePayload);
  const callbackUrl = `${appUrlOrigin}/auth/shopify/callback`;

  const authorize = new URL(`https://${shop}/admin/oauth/authorize`);
  authorize.searchParams.set("client_id", apiKey);
  authorize.searchParams.set("scope", scopes);
  authorize.searchParams.set("redirect_uri", callbackUrl);
  authorize.searchParams.set("state", state);

  return redirect(authorize.toString(), {
    headers: {
      "Set-Cookie": buildCookie(
        OAUTH_STATE_COOKIE,
        state,
        OAUTH_STATE_TTL_SECONDS,
      ),
    },
  });
}

function verifyShopifyCallbackHmac(url: URL, secret: string): boolean {
  const receivedHmac = url.searchParams.get("hmac");
  if (!receivedHmac) return false;

  const pairs: string[] = [];
  url.searchParams.forEach((value, key) => {
    if (key === "hmac" || key === "signature") return;
    pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const message = pairs.join("&");
  const expected = createHmac("sha256", secret).update(message).digest("hex");
  return safeCompare(expected, receivedHmac);
}

async function exchangeAccessToken(shop: string, code: string): Promise<string> {
  const { apiKey, apiSecret } = requireShopifyOAuthConfig();
  const tokenUrl = `https://${shop}/admin/oauth/access_token`;
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: apiKey,
      client_secret: apiSecret,
      code,
    }),
  });
  if (!res.ok) {
    throw new Error(`Shopify token exchange failed: HTTP ${res.status}`);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("Shopify token exchange returned no access_token.");
  }
  return json.access_token;
}

export async function completeShopifyOAuth(
  request: Request,
  ctx: ServerContext,
): Promise<Response> {
  const { apiSecret } = requireShopifyOAuthConfig();
  const url = new URL(request.url);
  const shopRaw = url.searchParams.get("shop");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!shopRaw || !code || !state) {
    throw new Response("Invalid Shopify callback parameters", { status: 400 });
  }
  const shop = normalizeShopDomain(shopRaw);

  const cookies = parseCookie(request.headers.get("Cookie"));
  const storedState = cookies.get(OAUTH_STATE_COOKIE);
  if (!storedState || !safeCompare(storedState, state)) {
    throw new Response("OAuth state mismatch", { status: 401 });
  }

  const statePayload = deserializeState(state);
  if (!statePayload) {
    throw new Response("Invalid OAuth state payload", { status: 400 });
  }
  const isExpired =
    Date.now() - statePayload.issuedAt > OAUTH_STATE_TTL_SECONDS * 1000;
  if (isExpired) {
    throw new Response("OAuth state expired", { status: 401 });
  }

  if (!verifyShopifyCallbackHmac(url, apiSecret)) {
    throw new Response("Invalid Shopify callback signature", { status: 401 });
  }

  const accessToken = await exchangeAccessToken(shop, code);
  let shopName = shop;
  try {
    const adminClient = createAdminClient({
      shopDomain: shop,
      accessToken,
    });
    shopName = await adminClient.verifyShop();
  } catch {
    // Name lookup failure should not block OAuth completion.
  }

  const shopRecord = await upsertShopRecord(ctx.repo, {
    domain: shop,
    name: shopName,
  });
  await ctx.secrets.setShopToken(shopRecord.id, accessToken);

  const next = resolvePostAuthNext(
    sanitizeNext(statePayload.next),
    shopRecord.domain,
  );
  const headers = new Headers();
  headers.append("Set-Cookie", clearCookie(OAUTH_STATE_COOKIE));
  headers.append(
    "Set-Cookie",
    setShopSessionCookie({
      shopId: shopRecord.id,
      shopDomain: shopRecord.domain,
    }),
  );
  return redirect(next, {
    headers,
  });
}
