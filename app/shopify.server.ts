import "~/lib/load-production-env.server";
import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";

import { SHOPIFY_ADMIN_API_VERSION } from "~/lib/shopify-api-version";
import { DynamoDbSessionStorage } from "~/lib/server/aws/session-storage.ddb";
import { useAwsDataLayer } from "~/lib/server/env";
import { ensureServerContext } from "~/lib/server/factory";
import { syncShopFromSession } from "~/lib/server/shop-sync.server";

const sessionStorage = useAwsDataLayer()
  ? new DynamoDbSessionStorage()
  : new MemorySessionStorage();

function normalizeAppUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(",").map((s) => s.trim()).filter(Boolean),
  appUrl: normalizeAppUrl(process.env.SHOPIFY_APP_URL || process.env.HOST),
  authPathPrefix: "/auth",
  sessionStorage,
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true,
  },
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/uninstalled",
    },
    APP_SCOPES_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/scopes_update",
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      const ctx = await ensureServerContext();
      await syncShopFromSession(ctx, session);
      await shopify.registerWebhooks({ session });
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const adminApiVersion = SHOPIFY_ADMIN_API_VERSION;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorageExport = shopify.sessionStorage;
