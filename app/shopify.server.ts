import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { MemorySessionStorage } from "@shopify/shopify-app-session-storage-memory";

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
  apiVersion: ApiVersion.October24,
  scopes: process.env.SCOPES?.split(",").map((s) => s.trim()).filter(Boolean),
  // Amplify 的 env 常被误填成带路径的 /app；这里统一归一成 origin
  appUrl: normalizeAppUrl(process.env.SHOPIFY_APP_URL || process.env.HOST),
  authPathPrefix: "/auth",
  sessionStorage,
  distribution: AppDistribution.AppStore,
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/uninstalled",
    },
    PAGES_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/pages/update",
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      const ctx = await ensureServerContext();
      await syncShopFromSession(ctx, session);
      await shopify.registerWebhooks({ session });
    },
  },
});

export default shopify;
export const authenticate = shopify.authenticate;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorageExport = shopify.sessionStorage;
