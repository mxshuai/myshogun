import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, "..", "..");
const shopifyPagesPath = path.join(root, "shopify-pages.json");
const importedIdsPath = path.join(root, "shopify-imported-ids.json");

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
  try {
    const raw = await fs.readFile(importedIdsPath, "utf8");
    const j = JSON.parse(raw) as { ids?: string[] };
    return Array.isArray(j.ids) ? j.ids : [];
  } catch {
    return [];
  }
}

async function writeImportedIds(ids: string[]) {
  await fs.writeFile(
    importedIdsPath,
    JSON.stringify({ ids }, null, 2),
    { encoding: "utf8" }
  );
}

export async function listShopifyPages(): Promise<ShopifyPageRow[]> {
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
