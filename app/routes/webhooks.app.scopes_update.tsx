import { Session } from "@shopify/shopify-api";

import { authenticate, sessionStorageExport } from "~/shopify.server";

import type { Route } from "./+types/webhooks.app.scopes_update";

export async function action({ request }: Route.ActionArgs) {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Webhook ${topic} for ${shop}`);

  const body = payload as { current?: string[] };
  const current = body.current;
  if (session && current?.length) {
    const scope = current.join(",");
    const updated = new Session({ ...session.toObject(), scope });
    await sessionStorageExport.storeSession(updated);
  }

  return new Response();
}
