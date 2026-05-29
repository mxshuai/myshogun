import { Form, Link, data, redirect, useLoaderData } from "react-router";

import type { Route } from "./+types/admin.shops";
import { requireAdmin } from "~/lib/server/auth.server";
import { ensureServerContext } from "~/lib/server/factory";
import { normalizeShopDomain, upsertShopRecord } from "~/lib/server/page-ops";
import { createAdminClient } from "~/lib/server/shopify";

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const session = requireAdmin(request);
    const ctx = await ensureServerContext();
    const shops = await ctx.repo.listShops();
    return { shops, loadError: null as string | null, session };
  } catch (error) {
    if (error instanceof Response) throw error;
    const message = error instanceof Error ? error.message : String(error);
    return {
      shops: [],
      loadError: `Server context init failed: ${message}`,
      session: null,
    };
  }
}

export async function action({ request }: Route.ActionArgs) {
  requireAdmin(request);
  const ctx = await ensureServerContext();
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "create") {
    const domain = String(form.get("domain") ?? "");
    const name = String(form.get("name") ?? "");
    const next = String(form.get("next") ?? "/admin/shops");
    if (!domain) {
      return data({ error: "Domain is required" }, { status: 400 });
    }
    await upsertShopRecord(ctx.repo, { domain, name });
    return redirect(
      `/auth/shopify/start?shop=${encodeURIComponent(
        normalizeShopDomain(domain),
      )}&next=${encodeURIComponent(next)}`,
    );
  }

  if (intent === "delete") {
    const id = String(form.get("shopId") ?? "");
    if (id) await ctx.repo.deleteShop(id);
    return data({ ok: true });
  }

  if (intent === "verify") {
    const id = String(form.get("shopId") ?? "");
    const shop = id ? await ctx.repo.getShop(id) : null;
    if (!shop) return data({ error: "Shop not found" }, { status: 404 });
    const token = await ctx.secrets.getShopToken(shop.id);
    if (!token) return data({ error: "No token configured" }, { status: 400 });
    try {
      const client = createAdminClient({
        shopDomain: shop.domain,
        accessToken: token,
      });
      const shopName = await client.verifyShop();
      return data({ ok: true, shopName });
    } catch (e) {
      return data(
        { error: e instanceof Error ? e.message : String(e) },
        { status: 400 }
      );
    }
  }

  if (intent === "reconnect") {
    const id = String(form.get("shopId") ?? "");
    const shop = id ? await ctx.repo.getShop(id) : null;
    if (!shop) {
      return data({ error: "Shop not found" }, { status: 404 });
    }
    return redirect(
      `/auth/shopify/start?shop=${encodeURIComponent(
        normalizeShopDomain(shop.domain),
      )}&next=${encodeURIComponent("/admin/shops")}`,
    );
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}

export default function AdminShops() {
  const { shops, loadError, session } = useLoaderData<typeof loader>();

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 960 }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h1>Shops</h1>
        <nav style={{ display: "flex", gap: 12 }}>
          <Link to="/pages">Pages list</Link>
          <Link to="/">Site</Link>
        </nav>
      </header>
      <div style={{ marginTop: 8, color: "#444", fontSize: 14 }}>
        Active session:{" "}
        {session ? `${session.shopDomain} (${session.shopId.slice(0, 8)}…)` : "none"}
      </div>
      {loadError ? (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: 8,
          }}
        >
          {loadError}
        </div>
      ) : null}

      <section style={{ marginTop: 24, padding: 16, border: "1px solid #ddd" }}>
        <h2>Add shop</h2>
        <Form method="post" style={{ display: "grid", gap: 8, maxWidth: 480 }}>
          <input type="hidden" name="intent" value="create" />
          <label>
            Domain (e.g. mystore.myshopify.com)
            <input name="domain" required style={{ display: "block", width: "100%" }} />
          </label>
          <label>
            Display name
            <input name="name" style={{ display: "block", width: "100%" }} />
          </label>
          <input type="hidden" name="next" value="/admin/shops" />
          <button type="submit">Create & connect via Shopify OAuth</button>
        </Form>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Connected shops</h2>
        {shops.length === 0 ? (
          <p>No shops yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {shops.map((shop) => (
              <li
                key={shop.id}
                style={{
                  border: "1px solid #eee",
                  padding: 16,
                  marginBottom: 12,
                  borderRadius: 8,
                }}
              >
                <strong>{shop.name}</strong>
                <div style={{ color: "#666", fontSize: 14 }}>
                  {normalizeShopDomain(shop.domain)}
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link to={`/admin/shops/${shop.id}/pages`}>Pages</Link>
                  <Form method="post" style={{ display: "inline" }}>
                    <input type="hidden" name="intent" value="verify" />
                    <input type="hidden" name="shopId" value={shop.id} />
                    <button type="submit">Verify token</button>
                  </Form>
                  <Form method="post" style={{ display: "inline" }}>
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="shopId" value={shop.id} />
                    <button type="submit">Delete</button>
                  </Form>
                  <Form method="post" style={{ display: "inline" }}>
                    <input type="hidden" name="intent" value="reconnect" />
                    <input type="hidden" name="shopId" value={shop.id} />
                    <button type="submit">Reconnect OAuth</button>
                  </Form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
