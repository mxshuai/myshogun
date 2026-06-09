import type { Data } from "@puckeditor/core";

import type { PageIndex, Repo, Shop } from "./types";

export function newId(): string {
  return crypto.randomUUID();
}

export function visbuildDataFromShopifyBody(
  title: string,
  body: string
): Data {
  return {
    content: [
      {
        type: "RawHTML",
        props: {
          html: body || "",
        },
      },
    ],
    root: {
      props: { title },
    },
  };
}

export async function createManagedPage(
  repo: Repo,
  params: {
    shopId: string;
    title: string;
    handle: string;
    visbuildData?: Data;
    shopifyPageGid?: string | null;
  }
): Promise<PageIndex> {
  const pageId = newId();
  const now = new Date().toISOString();
  const visbuildData =
    params.visbuildData ??
    ({
      content: [],
      root: { props: { title: params.title } },
    } as Data);

  const index: PageIndex = {
    pageId,
    shopId: params.shopId,
    handle: params.handle,
    title: params.title,
    status: params.shopifyPageGid ? "published" : "draft",
    shopifyPageGid: params.shopifyPageGid ?? null,
    lastPublishedAt: null,
    pendingJobId: null,
    pagePath: params.handle.startsWith("/") ? params.handle : `/${params.handle}`,
    updatedAt: now,
    scheduledPublishAt: null,
  };

  await repo.putPageIndex(index);
  await repo.putPageBody({
    pageId,
    currentVisbuildData: visbuildData,
    currentHtml: null,
  });

  return index;
}

export function normalizeShopDomain(raw: string): string {
  const d = raw.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  return d.includes(".") ? d : `${d}.myshopify.com`;
}

export function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function upsertShopRecord(
  repo: Repo,
  params: { id?: string; domain: string; name: string }
): Promise<Shop> {
  const domain = normalizeShopDomain(params.domain);
  // Reuse the existing shop id for this domain so repeated logins / OAuth
  // callbacks stay idempotent. Minting a fresh id each time would orphan the
  // shop's pages (they are keyed by shopId).
  let id = params.id;
  if (!id) {
    const shops = await repo.listShops();
    id = shops.find((s) => s.domain === domain)?.id ?? newId();
  }
  const now = new Date().toISOString();
  const existing = await repo.getShop(id);
  const shop: Shop = {
    id,
    domain,
    name: params.name.trim() || params.domain,
    tokenSecretRef: existing?.tokenSecretRef ?? `pending://${id}`,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await repo.putShop(shop);
  return shop;
}
