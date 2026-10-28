import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type { TransactWriteCommandInput } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import { toVersionSummaries, type VersionListRow } from "../../page-version";
import { getAwsRegion, getDynamoTableName } from "../env";
import { paginateMediaList } from "../media-pagination.server";
import type {
  MediaAsset,
  PageBody,
  PageIndex,
  Repo,
  Shop,
  VersionSchedule,
} from "../types";
import {
  GSI1_NAME,
  SHOP_DIR_PK,
  gidLookupPk,
  jobFromItem,
  jobToItem,
  mediaAssetFromItem,
  mediaAssetToItem,
  pageBodyFromItem,
  pageBodyToItem,
  pageIndexFromItem,
  pageIndexToItem,
  pagePk,
  scheduleFromItem,
  scheduleSk,
  scheduleToItem,
  shopDirSk,
  shopDomainLookupPk,
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

export function createDdbRepo(): Repo {
  const doc = client();

  return {
    async getShop(id) {
      const res = await doc.send(
        new GetCommand({ TableName: TableName(), Key: { PK: shopPk(id), SK: "META" } })
      );
      return res.Item ? shopFromItem(res.Item) : null;
    },

    async getShopByDomain(domain) {
      const lookup = await doc.send(
        new GetCommand({
          TableName: TableName(),
          Key: { PK: shopDomainLookupPk(domain), SK: "META" },
        })
      );
      if (lookup.Item?.shopId) {
        return this.getShop(String(lookup.Item.shopId));
      }
      // Pre-migration fallback: listShops() self-heals the directory and the
      // domain lookups, so the next call hits the O(1) lookup above.
      const shops = await this.listShops();
      return shops.find((s) => s.domain === domain) ?? null;
    },

    async listShops() {
      const res = await doc.send(
        new QueryCommand({
          TableName: TableName(),
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: { ":pk": SHOP_DIR_PK, ":sk": "SHOP#" },
        })
      );
      if (res.Items && res.Items.length > 0) {
        return res.Items
          .map((i) => shopFromItem(i))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
      // Empty directory (pre-migration): fall back to a one-time full scan and
      // backfill the directory + domain lookups so later calls are Queries.
      const scan = await doc.send(
        new ScanCommand({
          TableName: TableName(),
          FilterExpression: "#e = :shop",
          ExpressionAttributeNames: { "#e": "entity" },
          ExpressionAttributeValues: { ":shop": "shop" },
        })
      );
      const shops = (scan.Items ?? []).map((i) => shopFromItem(i));
      for (const shop of shops) await this.putShop(shop);
      return shops.sort((a, b) => a.name.localeCompare(b.name));
    },

    async putShop(shop) {
      // Fetch prior record first so a domain change can clean up its stale
      // domain -> shop lookup below.
      const prev = await this.getShop(shop.id);
      await doc.send(
        new PutCommand({ TableName: TableName(), Item: shopToItem(shop) })
      );
      // Directory pointer (denormalized copy) powers listShops() via Query.
      await doc.send(
        new PutCommand({
          TableName: TableName(),
          Item: {
            PK: SHOP_DIR_PK,
            SK: shopDirSk(shop.id),
            entity: "shop_dir",
            ...shop,
          },
        })
      );
      // Reverse lookup domain -> shopId for O(1) domain resolution.
      await doc.send(
        new PutCommand({
          TableName: TableName(),
          Item: {
            PK: shopDomainLookupPk(shop.domain),
            SK: "META",
            entity: "shop_lookup",
            shopId: shop.id,
          },
        })
      );
      if (prev && prev.domain !== shop.domain) {
        await doc.send(
          new DeleteCommand({
            TableName: TableName(),
            Key: { PK: shopDomainLookupPk(prev.domain), SK: "META" },
          })
        );
      }
    },

    async deleteShop(id) {
      const shop = await this.getShop(id);
      const pages = await this.listPagesByShop(id);
      for (const p of pages) await this.deletePage(p.pageId);
      await doc.send(
        new DeleteCommand({
          TableName: TableName(),
          Key: { PK: shopPk(id), SK: "META" },
        })
      );
      await doc.send(
        new DeleteCommand({
          TableName: TableName(),
          Key: { PK: SHOP_DIR_PK, SK: shopDirSk(id) },
        })
      );
      if (shop) {
        await doc.send(
          new DeleteCommand({
            TableName: TableName(),
            Key: { PK: shopDomainLookupPk(shop.domain), SK: "META" },
          })
        );
      }
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
      // Atomic multi-write: the page index, its pageId -> shop lookup, and (when
      // present) the GID -> page reverse lookup all commit together, so a partial
      // failure can't leave a lookup pointing at a missing/half-written page.
      const items: NonNullable<TransactWriteCommandInput["TransactItems"]> = [
        { Put: { TableName: TableName(), Item: pageIndexToItem(index) } },
        {
          Put: {
            TableName: TableName(),
            Item: {
              PK: `PAGE_LOOKUP#${index.pageId}`,
              SK: "META",
              entity: "page_lookup",
              shopId: index.shopId,
              pageIndexSk: `PAGE#${index.pageId}`,
            },
          },
        },
      ];
      // Reverse lookup GID -> page, so Shopify webhooks resolve in O(1) instead
      // of scanning every shop's pages. Self-healing: rewritten on each save
      // while a GID is set; removed in deletePage.
      if (index.shopifyPageGid) {
        items.push({
          Put: {
            TableName: TableName(),
            Item: {
              PK: gidLookupPk(index.shopifyPageGid),
              SK: "META",
              entity: "gid_lookup",
              shopId: index.shopId,
              pageId: index.pageId,
            },
          },
        });
      }
      await doc.send(new TransactWriteCommand({ TransactItems: items }));
    },

    async patchPageIndex(index, patch) {
      const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
      if (entries.length === 0) return;
      const names: Record<string, string> = {};
      const values: Record<string, unknown> = {};
      const sets = entries.map(([key, value], i) => {
        names[`#f${i}`] = key;
        values[`:v${i}`] = value;
        return `#f${i} = :v${i}`;
      });
      const items: NonNullable<TransactWriteCommandInput["TransactItems"]> = [
        {
          Update: {
            TableName: TableName(),
            Key: { PK: shopPk(index.shopId), SK: `PAGE#${index.pageId}` },
            UpdateExpression: `SET ${sets.join(", ")}`,
            ConditionExpression: "attribute_exists(PK)",
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
          },
        },
      ];
      if (patch.shopifyPageGid) {
        items.push({
          Put: {
            TableName: TableName(),
            Item: {
              PK: gidLookupPk(patch.shopifyPageGid),
              SK: "META",
              entity: "gid_lookup",
              shopId: index.shopId,
              pageId: index.pageId,
            },
          },
        });
      }
      await doc.send(new TransactWriteCommand({ TransactItems: items }));
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

      const schedules = await doc.send(
        new QueryCommand({
          TableName: TableName(),
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :v)",
          ExpressionAttributeValues: {
            ":pk": pagePk(pageId),
            ":v": "SCHEDULE#",
          },
        })
      );
      for (const item of schedules.Items ?? []) {
        await doc.send(
          new DeleteCommand({
            TableName: TableName(),
            Key: { PK: item.PK, SK: item.SK },
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
    },

    async listPageVersions(pageId) {
      const rows: VersionListRow[] = [];
      let lastKey: Record<string, unknown> | undefined;
      do {
        const res = await doc.send(
          new QueryCommand({
            TableName: TableName(),
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :v)",
            ExpressionAttributeValues: {
              ":pk": pagePk(pageId),
              ":v": "VERSION#",
            },
            ProjectionExpression: "entity, versionId, pageId, #src, createdAt, title",
            ExpressionAttributeNames: { "#src": "source" },
            ExclusiveStartKey: lastKey,
          }),
        );
        for (const item of res.Items ?? []) {
          if (item.entity !== "version") continue;
          rows.push({
            versionId: String(item.versionId),
            pageId: String(item.pageId),
            source: item.source as VersionListRow["source"],
            createdAt: String(item.createdAt),
            title: item.title ? String(item.title) : "Untitled",
          });
        }
        lastKey = res.LastEvaluatedKey;
      } while (lastKey);
      return toVersionSummaries(rows);
    },

    async putVersionSchedule(schedule: VersionSchedule) {
      await doc.send(
        new PutCommand({
          TableName: TableName(),
          Item: scheduleToItem(schedule),
        }),
      );
    },

    async getVersionSchedule(pageId, versionId) {
      const res = await doc.send(
        new GetCommand({
          TableName: TableName(),
          Key: { PK: pagePk(pageId), SK: scheduleSk(versionId) },
        }),
      );
      return res.Item && res.Item.entity === "version_schedule"
        ? scheduleFromItem(res.Item)
        : null;
    },

    async listVersionSchedules(pageId) {
      const schedules: VersionSchedule[] = [];
      let lastKey: Record<string, unknown> | undefined;
      do {
        const res = await doc.send(
          new QueryCommand({
            TableName: TableName(),
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :v)",
            ExpressionAttributeValues: {
              ":pk": pagePk(pageId),
              ":v": "SCHEDULE#",
            },
            ExclusiveStartKey: lastKey,
          }),
        );
        for (const item of res.Items ?? []) {
          if (item.entity === "version_schedule") {
            schedules.push(scheduleFromItem(item));
          }
        }
        lastKey = res.LastEvaluatedKey;
      } while (lastKey);
      return schedules;
    },

    async deleteVersionSchedule(pageId, versionId) {
      await doc.send(
        new DeleteCommand({
          TableName: TableName(),
          Key: { PK: pagePk(pageId), SK: scheduleSk(versionId) },
        }),
      );
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

    async putMediaAsset(asset: MediaAsset) {
      await doc.send(
        new PutCommand({
          TableName: TableName(),
          Item: mediaAssetToItem(asset),
        })
      );
    },

    async listMediaAssets(shopId, params) {
      const query = params?.query?.trim().toLowerCase();

      const all: MediaAsset[] = [];
      let lastKey: Record<string, unknown> | undefined;
      do {
        const res = await doc.send(
          new QueryCommand({
            TableName: TableName(),
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
            ExpressionAttributeValues: {
              ":pk": shopPk(shopId),
              ":prefix": "MEDIA#",
            },
            ScanIndexForward: false,
            ExclusiveStartKey: lastKey,
          }),
        );
        for (const item of res.Items ?? []) {
          if (item.entity === "media_asset") {
            all.push(mediaAssetFromItem(item));
          }
        }
        lastKey = res.LastEvaluatedKey;
      } while (lastKey);

      const filtered = query
        ? all.filter((a) => a.filename.toLowerCase().includes(query))
        : all;

      const page = paginateMediaList(filtered, params);
      return {
        assets: page.items,
        total: page.total,
        page: page.page,
        pageSize: page.pageSize,
        totalPages: page.totalPages,
      };
    },
  };
}
