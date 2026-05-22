import {
  CreateSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

import { getAwsRegion } from "../env";
import type { SecretsStore } from "../types";
import { getRepo } from "../factory";

const PREFIX = process.env.SHOPIFY_TOKEN_SECRET_PREFIX?.trim() || "visbuild-shopify/token";

function smClient() {
  return new SecretsManagerClient({ region: getAwsRegion() });
}

function secretName(shopId: string) {
  return `${PREFIX}/${shopId}`;
}

export function createSecretsManagerStore(): SecretsStore {
  const sm = smClient();

  return {
    async getShopToken(shopId) {
      const repo = getRepo();
      const shop = await repo.getShop(shopId);
      if (!shop?.tokenSecretRef || shop.tokenSecretRef.startsWith("pending://")) {
        return null;
      }
      try {
        const res = await sm.send(
          new GetSecretValueCommand({ SecretId: shop.tokenSecretRef })
        );
        return res.SecretString ?? null;
      } catch {
        const byName = await sm.send(
          new GetSecretValueCommand({ SecretId: secretName(shopId) })
        );
        return byName.SecretString ?? null;
      }
    },

    async setShopToken(shopId, token) {
      const repo = getRepo();
      const shop = await repo.getShop(shopId);
      if (!shop) throw new Error("Shop not found");

      const name = secretName(shopId);
      let arn = shop.tokenSecretRef;

      if (!arn || arn.startsWith("pending://") || arn.startsWith("dev-secret://")) {
        try {
          const created = await sm.send(
            new CreateSecretCommand({
              Name: name,
              SecretString: token,
            })
          );
          arn = created.ARN ?? name;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (!/already exists|ResourceExists/i.test(msg)) throw e;
          await sm.send(
            new PutSecretValueCommand({ SecretId: name, SecretString: token })
          );
          arn = name;
        }
      } else {
        await sm.send(
          new PutSecretValueCommand({ SecretId: arn, SecretString: token })
        );
      }

      shop.tokenSecretRef = arn;
      shop.updatedAt = new Date().toISOString();
      await repo.putShop(shop);
      return arn;
    },
  };
}
