import fs from "fs/promises";

import {
  ensureShogunDataDirectory,
  getShopifyJsonPaths,
} from "./data-paths.server";

export type ShopifyPageMock = {
  id: string;
  title: string;
  handle: string;
  filterType: string;
  isHome?: boolean;
};

export type ShopifyPageRow = ShopifyPageMock & {
  imported: boolean;
};

async function readImportedIds(): Promise<string[]> {
  const { importedIdsPath } = getShopifyJsonPaths();
  try {
    const raw = await fs.readFile(importedIdsPath, "utf8");
    const j = JSON.parse(raw) as { ids?: string[] };
    return Array.isArray(j.ids) ? j.ids : [];
  } catch {
    return [];
  }
}

async function writeImportedIds(ids: string[]) {
  const { importedIdsPath } = getShopifyJsonPaths();
  await ensureShogunDataDirectory();
  await fs.writeFile(
    importedIdsPath,
    JSON.stringify({ ids }, null, 2),
    { encoding: "utf8" }
  );
}

export async function listShopifyPages(): Promise<ShopifyPageRow[]> {
  const { shopifyPagesPath } = getShopifyJsonPaths();
  let mocks: ShopifyPageMock[] = [];
  try {
    const raw = await fs.readFile(shopifyPagesPath, "utf8");
    mocks = JSON.parse(raw) as ShopifyPageMock[];
  } catch {
    mocks = [];
  }
  const imported = new Set(await readImportedIds());
  return mocks.map((m) => ({
    ...m,
    imported: imported.has(m.id),
  }));
}

export async function markShopifyPageImported(id: string): Promise<boolean> {
  const { shopifyPagesPath } = getShopifyJsonPaths();
  const mocks = await (async () => {
    try {
      const raw = await fs.readFile(shopifyPagesPath, "utf8");
      return JSON.parse(raw) as ShopifyPageMock[];
    } catch {
      return [];
    }
  })();
  const exists = mocks.some((m) => m.id === id);
  if (!exists) return false;

  const ids = await readImportedIds();
  if (ids.includes(id)) return true;
  ids.push(id);
  await writeImportedIds(ids);
  return true;
}
