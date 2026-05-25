import { authenticate, sessionStorageExport } from "~/shopify.server";
import { ensureServerContext } from "~/lib/server/factory";
import { findShopByDomain } from "~/lib/server/shop-sync.server";

import type { Route } from "./+types/webhooks.app.uninstalled";

export async function action({ request }: Route.ActionArgs) {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Webhook ${topic} for ${shop}`);

  if (session) {
    await sessionStorageExport.deleteSession(session.id);
  }

  const ctx = await ensureServerContext();
  const record = await findShopByDomain(ctx.repo, shop);
  if (record) {
    await ctx.repo.deleteShop(record.id);
  }

  return new Response();
}
