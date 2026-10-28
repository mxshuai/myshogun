/**
 * 清空应用数据。旧的页面级定时数据不再兼容，升级前执行。
 *
 *   npx tsx scripts/clear-app-data.ts --dry-run
 *   npx tsx scripts/clear-app-data.ts --keep-shops
 *
 * --keep-shops  保留店铺、店铺目录和域名索引，避免重新 OAuth
 * --dry-run     只打印将删除的数量
 */
import { readFileSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  ScanCommand,
  DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import {
  DeleteScheduleCommand,
  ListSchedulesCommand,
  SchedulerClient,
} from "@aws-sdk/client-scheduler";

import { getAwsRegion, getDynamoTableName } from "../app/lib/server/env";

function loadEnvFile(filename: string) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function keepItem(item: Record<string, unknown>, keepShops: boolean): boolean {
  if (!keepShops) return false;
  const entity = String(item.entity ?? "");
  return entity === "shop" || entity === "shop_dir" || entity === "shop_lookup";
}

async function clearTable(dryRun: boolean, keepShops: boolean) {
  const region = getAwsRegion();
  const tableName = getDynamoTableName();
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
    marshallOptions: { removeUndefinedValues: true },
  });
  let lastKey: Record<string, unknown> | undefined;
  let deleted = 0;
  let kept = 0;
  do {
    const res = await doc.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression: "PK, SK, entity",
        ExclusiveStartKey: lastKey,
      }),
    );
    const keys = (res.Items ?? []).filter((item) => {
      if (keepItem(item, keepShops)) {
        kept += 1;
        return false;
      }
      return true;
    });
    if (!dryRun) {
      for (let i = 0; i < keys.length; i += 25) {
        const chunk = keys.slice(i, i + 25);
        if (chunk.length === 0) continue;
        let requests = chunk.map((item) => ({
          DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
        }));
        for (let attempt = 0; requests.length > 0; attempt += 1) {
          if (attempt >= 8) {
            throw new Error(`${requests.length} items still unprocessed after retries`);
          }
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, Math.min(5000, 100 * 2 ** attempt)));
          }
          const res = await doc.send(
            new BatchWriteCommand({ RequestItems: { [tableName]: requests } }),
          );
          requests = (res.UnprocessedItems?.[tableName] ?? []) as typeof requests;
        }
      }
    }
    deleted += keys.length;
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  console.log(
    `${dryRun ? "Would delete" : "Deleted"} ${deleted} DynamoDB items from ${tableName}; kept ${kept}.`,
  );
}

async function clearSchedules(dryRun: boolean) {
  const client = new SchedulerClient({ region: getAwsRegion() });
  let nextToken: string | undefined;
  let count = 0;
  do {
    const res = await client.send(
      new ListSchedulesCommand({
        NamePrefix: "visbuild-publish-",
        MaxResults: 100,
        NextToken: nextToken,
      }),
    );
    for (const schedule of res.Schedules ?? []) {
      if (!schedule.Name) continue;
      count += 1;
      if (!dryRun) {
        await client.send(new DeleteScheduleCommand({ Name: schedule.Name }));
      }
    }
    nextToken = res.NextToken;
  } while (nextToken);
  console.log(
    `${dryRun ? "Would delete" : "Deleted"} ${count} EventBridge schedules.`,
  );
}

async function main() {
  loadEnvFile(".env.production.local");
  loadEnvFile(".env.production");
  const dryRun = process.argv.includes("--dry-run");
  const keepShops = process.argv.includes("--keep-shops");
  const localOnly = process.argv.includes("--local");

  const devFile = resolve(process.cwd(), ".dev-data", "repo.json");
  if (existsSync(devFile)) {
    if (dryRun) console.log(`Would delete ${devFile}`);
    else {
      rmSync(devFile);
      console.log(`Deleted ${devFile}`);
    }
  } else {
    console.log("No local .dev-data/repo.json");
  }

  if (localOnly) return;
  await clearTable(dryRun, keepShops);
  await clearSchedules(dryRun);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
