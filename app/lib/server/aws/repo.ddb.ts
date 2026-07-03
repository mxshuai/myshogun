import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import { getAwsRegion, getDynamoTableName } from "../env";
import type { PageBody, PageIndex, PageVersion, PublishJob, Repo, Shop } from "../types";
import {
  GSI1_NAME,
  gidLookupPk,
  jobFromItem,
  jobToItem,
  pageBodyFromItem,
  pageBodyToItem,
  pageIndexFromItem,
  pageIndexToItem,
  pagePk,
  shopFromItem,
  shopPk,
  shopToItem,
  versionFromItem,
  versionToItem,
} from "./ddb-keys";

function client() {
  const base = new DynamoDBClient({ region: getAwsRegion() });
  return DynamoDBDocumentClient.from(base, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

const TableName = () => getDynamoTableName();

/** Terminal jobs are kept this long, then auto-removed by DynamoDB TTL. */
const TERMINAL_JOB_TTL_DAYS = 30;
const TERMINAL_JOB_STATUSES = new Set(["done", "failed", "cancelled"]);

/** Keep at most this many versions per page; older ones pruned on append. */
const VERSION_HISTORY_LIMIT = 10;

export function createDdbRepo(): Repo {
  const doc = client();

  return {
    async getShop(id) {
      const res = await doc.send(
        new GetCommand({ TableName: TableName(), Key: { PK: shopPk(id), SK: "META" } })
      );
      return res.Item ? shopFromItem(res.Item) : null;
    },

    async listShops() {
      const res = await doc.send(
        new ScanCommand({
          TableName: TableName(),
          FilterExpression: "#e = :shop",
          ExpressionAttributeNames: { "#e": "entity" },
          ExpressionAttributeValues: { ":shop": "shop" },
        })
      );
      return (res.Items ?? [])
        .map((i) => shopFromItem(i))
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    async putShop(shop) {
      await doc.send(
        new PutCommand({ TableName: TableName(), Item: shopToItem(shop) })
      );
    },

    async deleteShop(id) {
      const pages = await this.listPagesByShop(id);
      for (const p of pages) await this.deletePage(p.pageId);
      await doc.send(
        new DeleteCommand({
          TableName: TableName(),
          Key: { PK: shopPk(id), SK: "META" },
        })
      );
    },

    async getPageIndex(pageId) {
      const direct = await doc.send(
        new GetCommand({
          TableName: TableName(),
          Key: { PK: `PAGE_LOOKUP#${pageId}`, SK: "META" },
        })
      );
      if (direct.Item?.shopId && direct.Item?.pageIndexSk) {
        const idx = await doc.send(
          new GetCommand({
            TableName: TableName(),
            Key: {
              PK: shopPk(String(direct.Item.shopId)),
              SK: String(direct.Item.pageIndexSk),
            },
          })
        );
        return idx.Item ? pageIndexFromItem(idx.Item) : null;
      }
      return null;
    },

    async getPageByGid(gid) {
      const lookup = await doc.send(
        new GetCommand({
          TableName: TableName(),
          Key: { PK: gidLookupPk(gid), SK: "META" },
        })
      );
      if (!lookup.Item?.pageId) return null;
      return this.getPageIndex(String(lookup.Item.pageId));
    },

    async listPagesByShop(shopId) {
      const res = await doc.send(
        new QueryCommand({
          TableName: TableName(),
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
          ExpressionAttributeValues: {
            ":pk": shopPk(shopId),
            ":prefix": "PAGE#",
          },
        })
      );
      return (res.Items ?? [])
        .filter((i) => i.entity === "page_index")
        .map((i) => pageIndexFromItem(i));
    },

    async putPageIndex(index) {
      await doc.send(
        new PutCommand({ TableName: TableName(), Item: pageIndexToItem(index) })
      );
      await doc.send(
        new PutCommand({
          TableName: TableName(),
          Item: {
            PK: `PAGE_LOOKUP#${index.pageId}`,
            SK: "META",
            entity: "page_lookup",
            shopId: index.shopId,
            pageIndexSk: `PAGE#${index.pageId}`,
          },
        })
      );
      // Reverse lookup GID -> page, so Shopify webhooks resolve in O(1)
      // instead of scanning every shop's pages. Self-healing: rewritten on
      // each save while a GID is set; removed in deletePage.
      if (index.shopifyPageGid) {
        await doc.send(
          new PutCommand({
            TableName: TableName(),
            Item: {
              PK: gidLookupPk(index.shopifyPageGid),
              SK: "META",
              entity: "gid_lookup",
              shopId: index.shopId,
              pageId: index.pageId,
            },
          })
        );
      }
    },

    async deletePage(pageId) {
      const index = await this.getPageIndex(pageId);
      if (index) {
        await doc.send(
          new DeleteCommand({
            TableName: TableName(),
            Key: { PK: shopPk(index.shopId), SK: `PAGE#${pageId}` },
          })
        );
      }
      await doc.send(
        new DeleteCommand({
          TableName: TableName(),
          Key: { PK: `PAGE_LOOKUP#${pageId}`, SK: "META" },
        })
      );
      if (index?.shopifyPageGid) {
        await doc.send(
          new DeleteCommand({
            TableName: TableName(),
            Key: { PK: gidLookupPk(index.shopifyPageGid), SK: "META" },
          })
        );
      }
      const bodyKey = { PK: pagePk(pageId), SK: "META" };
      await doc.send(new DeleteCommand({ TableName: TableName(), Key: bodyKey }));

      const versions = await doc.send(
        new QueryCommand({
          TableName: TableName(),
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :v)",
          ExpressionAttributeValues: {
            ":pk": pagePk(pageId),
            ":v": "VERSION#",
          },
        })
      );
      for (const v of versions.Items ?? []) {
        await doc.send(
          new DeleteCommand({
            TableName: TableName(),
            Key: { PK: v.PK, SK: v.SK },
          })
        );
      }
    },

    async getPageBody(pageId) {
      const res = await doc.send(
        new GetCommand({
          TableName: TableName(),
          Key: { PK: pagePk(pageId), SK: "META" },
        })
      );
      return res.Item && res.Item.entity === "page_body"
        ? pageBodyFromItem(res.Item)
        : null;
    },

    async putPageBody(body) {
      await doc.send(
        new PutCommand({ TableName: TableName(), Item: pageBodyToItem(body) })
      );
    },

    async appendPageVersion(version) {
      await doc.send(
        new PutCommand({ TableName: TableName(), Item: versionToItem(version) })
      );
      // Prune: keep only the most recent N versions for this page.
      const res = await doc.send(
        new QueryCommand({
          TableName: TableName(),
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :v)",
          ExpressionAttributeValues: {
            ":pk": pagePk(version.pageId),
            ":v": "VERSION#",
          },
          ProjectionExpression: "PK, SK",
        })
      );
      const items = res.Items ?? [];
      if (items.length > VERSION_HISTORY_LIMIT) {
        // SK sorts chronologically (VERSION#{pageId}#{ts}#{source}); drop oldest.
        const sorted = [...items].sort((a, b) =>
          String(a.SK) < String(b.SK) ? -1 : String(a.SK) > String(b.SK) ? 1 : 0
        );
        const stale = sorted.slice(0, items.length - VERSION_HISTORY_LIMIT);
        for (const it of stale) {
          await doc.send(
            new DeleteCommand({
              TableName: TableName(),
              Key: { PK: it.PK, SK: it.SK },
            })
          );
        }
      }
    },

    async getPageVersion(versionId) {
      // versionId is `${pageId}#${ts}#${source}` and pageId is a UUID (no "#"),
      // so we can point-read the item instead of scanning the whole table.
      const pageId = versionId.split("#")[0];
      const res = await doc.send(
        new GetCommand({
          TableName: TableName(),
          Key: { PK: pagePk(pageId), SK: `VERSION#${versionId}` },
        })
      );
      return res.Item && res.Item.entity === "version"
        ? versionFromItem(res.Item)
        : null;
    },

    async putJob(job) {
      const item = jobToItem(job);
      if (job.status !== "pending") {
        delete (item as { GSI1PK?: string }).GSI1PK;
        delete (item as { GSI1SK?: string }).GSI1SK;
      }
      // TTL: let DynamoDB auto-expire terminal jobs; keep pending/running forever.
      if (TERMINAL_JOB_STATUSES.has(job.status)) {
        (item as { expiresAt?: number }).expiresAt =
          Math.floor(Date.now() / 1000) + TERMINAL_JOB_TTL_DAYS * 86400;
      } else {
        delete (item as { expiresAt?: number }).expiresAt;
      }
      await doc.send(new PutCommand({ TableName: TableName(), Item: item }));
    },

    async getJob(jobId) {
      const res = await doc.send(
        new GetCommand({
          TableName: TableName(),
          Key: { PK: `JOB#${jobId}`, SK: "META" },
        })
      );
      return res.Item ? jobFromItem(res.Item) : null;
    },

    async cancelJob(jobId) {
      const job = await this.getJob(jobId);
      if (!job) return;
      job.status = "cancelled";
      job.updatedAt = new Date().toISOString();
      await this.putJob(job);
    },

    async listPendingJobsBefore(isoTime) {
      const res = await doc.send(
        new QueryCommand({
          TableName: TableName(),
          IndexName: GSI1_NAME,
          KeyConditionExpression: "GSI1PK = :pk AND GSI1SK <= :t",
          ExpressionAttributeValues: {
            ":pk": "JOB_STATUS#pending",
            ":t": isoTime,
          },
        })
      );
      return (res.Items ?? [])
        .filter((i) => i.status === "pending")
        .map((i) => jobFromItem(i));
    },
  };
}
