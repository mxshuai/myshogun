import { Form, useSearchParams } from "react-router";

import type { Route } from "./+types/auth.shopify.start";
import { beginShopifyOAuth } from "~/lib/server/shopify-oauth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (shop) {
    return beginShopifyOAuth(request, shop, url.searchParams.get("next") ?? "/");
  }
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const shop = String(form.get("shop") ?? "").trim();
  const next = String(form.get("next") ?? "/");
  if (!shop) {
    return new Response("Missing shop domain", { status: 400 });
  }
  return beginShopifyOAuth(request, shop, next);
}

export default function ShopifyAuthStart() {
  const [params] = useSearchParams();
  const next = params.get("next") ?? "/";
  return (
    <div style={{ maxWidth: 460, margin: "4rem auto", fontFamily: "system-ui" }}>
      <h1>Connect Shopify shop</h1>
      <p style={{ color: "#666" }}>
        Enter your shop domain to continue with Shopify OAuth.
      </p>
      <Form method="post">
        <input type="hidden" name="next" value={next} />
        <label style={{ display: "block", marginBottom: 8 }}>
          Shop domain
          <input
            name="shop"
            type="text"
            placeholder="example.myshopify.com"
            required
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
        <button type="submit">Continue</button>
      </Form>
    </div>
  );
}
