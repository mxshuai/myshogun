import type { SecretsStore } from "../types";
import { createDevRepo } from "./repo.dev";
import { readJsonFile, writeJsonFile } from "./persist";

type TokenStore = Record<string, string>;

const FILE = "secrets.json";

export function createDevSecretsStore(): SecretsStore {
  const repo = createDevRepo();
  return {
    async getShopToken(shopId) {
      const store = await readJsonFile<TokenStore>(FILE, {});
      return store[shopId] ?? null;
    },
    async setShopToken(shopId, token) {
      const store = await readJsonFile<TokenStore>(FILE, {});
      store[shopId] = token;
      await writeJsonFile(FILE, store);
      const ref = `dev-secret://${shopId}`;
      const shop = await repo.getShop(shopId);
      if (shop) {
        shop.tokenSecretRef = ref;
        shop.updatedAt = new Date().toISOString();
        await repo.putShop(shop);
      }
      return ref;
    },
  };
}
