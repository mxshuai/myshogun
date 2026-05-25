import { Form, Link, data, useLoaderData } from "react-router";

import type { Route } from "./+types/app.pages";
import { authenticateAppAdmin } from "~/lib/server/shopify-auth.server";
import {
  createManagedPage,
  normalizeHandle,
  visbuildDataFromShopifyBody,
} from "~/lib/server/page-ops";
import { savePageDraft } from "~/lib/server/publish";
import { createAdminClient } from "~/lib/server/shopify";

export async function loader({ request }: Route.LoaderArgs) {
  const { shop, ctx } = await authenticateAppAdmin(request);
  const pages = await ctx.repo.listPagesByShop(shop.id);
  return { shop, pages };
}

export async function action({ request }: Route.ActionArgs) {
  const { shop, ctx } = await authenticateAppAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "create") {
    const title = String(form.get("title") ?? "Untitled");
    const handle = normalizeHandle(String(form.get("handle") ?? title));
    if (!handle) return data({ error: "Invalid handle" }, { status: 400 });
    const page = await createManagedPage(ctx.repo, {
      shopId: shop.id,
      title,
      handle,
    });
    return data({ ok: true, pageId: page.pageId });
  }

  if (intent === "import") {
    const gid = String(form.get("shopifyPageGid") ?? "");
    const token = await ctx.secrets.getShopToken(shop.id);
    if (!token) return data({ error: "Shop token missing" }, { status: 400 });
    const client = createAdminClient({
      shopDomain: shop.domain,
      accessToken: token,
    });
    const remote = await client.getPage(gid);
    if (!remote) return data({ error: "Page not found on Shopify" }, { status: 404 });

    const visbuildData = visbuildDataFromShopifyBody(remote.title, remote.body);
    const page = await createManagedPage(ctx.repo, {
      shopId: shop.id,
      title: remote.title,
      handle: remote.handle,
      visbuildData,
      shopifyPageGid: remote.id,
    });
    await savePageDraft(page.pageId, ctx, visbuildData);
    const index = await ctx.repo.getPageIndex(page.pageId);
    if (index) {
      index.status = remote.isPublished ? "published" : "draft";
      index.lastPublishedAt = remote.updatedAt;
      await ctx.repo.putPageIndex(index);
    }
    return data({ ok: true, pageId: page.pageId });
  }

  if (intent === "importAll") {
    const token = await ctx.secrets.getShopToken(shop.id);
    if (!token) return data({ error: "Shop token missing" }, { status: 400 });
    const client = createAdminClient({
      shopDomain: shop.domain,
      accessToken: token,
    });
    let after: string | undefined;
    let imported = 0;
    do {
      const batch = await client.listPages({ first: 50, after });
      for (const node of batch.nodes) {
        const existing = (await ctx.repo.listPagesByShop(shop.id)).find(
          (p) => p.shopifyPageGid === node.id
        );
        if (existing) continue;
        const visbuildData = visbuildDataFromShopifyBody(node.title, node.body);
        const page = await createManagedPage(ctx.repo, {
          shopId: shop.id,
          title: node.title,
          handle: node.handle,
          visbuildData,
          shopifyPageGid: node.id,
        });
        await savePageDraft(page.pageId, ctx, visbuildData);
        imported += 1;
      }
      if (!batch.pageInfo.hasNextPage) break;
      after = batch.pageInfo.endCursor ?? undefined;
    } while (after);
    return data({ ok: true, imported });
  }

  if (intent === "delete") {
    const pageId = String(form.get("pageId") ?? "");
    if (pageId) await ctx.repo.deletePage(pageId);
    return data({ ok: true });
  }

  return data({ error: "Unknown intent" }, { status: 400 });
}

export default function AppPages() {
  const { shop, pages } = useLoaderData<typeof loader>();

  return (
    <div style={{ fontFamily: "system-ui", padding: 16, maxWidth: 960 }}>
      <h1>{shop.name} — Pages</h1>

      <section style={{ marginTop: 16 }}>
        <Form method="post" style={{ display: "inline" }}>
          <input type="hidden" name="intent" value="importAll" />
          <button type="submit">Import all from Shopify</button>
        </Form>
      </section>

      <section style={{ marginTop: 16, padding: 16, border: "1px solid #ddd" }}>
        <h2>New page</h2>
        <Form method="post" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input type="hidden" name="intent" value="create" />
          <input name="title" placeholder="Title" required />
          <input name="handle" placeholder="handle (optional)" />
          <button type="submit">Create</button>
        </Form>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2>Import by GID</h2>
        <Form method="post" style={{ display: "flex", gap: 8 }}>
          <input type="hidden" name="intent" value="import" />
          <input
            name="shopifyPageGid"
            placeholder="gid://shopify/Page/..."
            style={{ flex: 1 }}
            required
          />
          <button type="submit">Import</button>
        </Form>
      </section>

      <ul style={{ listStyle: "none", padding: 0, marginTop: 24 }}>
        {pages.length === 0 ? (
          <li>No pages yet.</li>
        ) : (
          pages.map((p) => (
            <li
              key={p.pageId}
              style={{
                border: "1px solid #eee",
                padding: 12,
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <Link to={`/app/pages/${p.pageId}`}>
                  <strong>{p.title}</strong>
                </Link>
                <div style={{ fontSize: 13, color: "#666" }}>
                  /{p.handle} · {p.status}
                  {p.pendingJobId ? " · scheduled" : ""}
                </div>
              </div>
              <Form method="post">
                <input type="hidden" name="intent" value="delete" />
                <input type="hidden" name="pageId" value={p.pageId} />
                <button type="submit">Delete</button>
              </Form>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
