/**
 * 方案 C 验收：写入 Secrets + DynamoDB 测试数据，并调用 Publish Lambda。
 *
 * 用法（仓库根目录）：
 *   1. 在 .env.production.local 配置 SHOPIFY_SHOP_DOMAIN、SHOPIFY_ACCESS_TOKEN
 *   2. npm run seed:publish-test
 *
 * 可选环境变量：
 *   SHOPIFY_PAGE_GID     已有 Shopify Page GID；不填则自动 pageCreate 测试页
 *   PUBLISH_LAMBDA_ARN   默认从 .env 或 CloudFormation 输出
 *   SEED_SKIP_INVOKE=1   只写入数据，不调用 Lambda
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  CreateSecretCommand,
  PutSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { Data } from "@puckeditor/core";

import { convertToShopifyBody } from "../app/lib/convert-to-shopify-body";
import { createAdminClient } from "../app/lib/server/shopify";
import {
  jobFromItem,
  jobToItem,
  pageBodyToItem,
  pageIndexToItem,
  shopToItem,
  versionToItem,
} from "../app/lib/server/aws/ddb-keys";
import type { PageBody, PageIndex, PageVersion, PublishJob, Shop } from "../app/lib/server/types";

function loadEnvFile(filename: string) {
  const path = resolve(process.cwd(), filename);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env: ${name} (set in .env.production.local)`);
  return v;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function ensureShopifyPageGid(params: {
  shopDomain: string;
  token: string;
  pageGid?: string;
  title: string;
  handle: string;
  html: string;
}): Promise<string> {
  if (params.pageGid) return params.pageGid;

  const client = createAdminClient({
    shopDomain: params.shopDomain,
    accessToken: params.token,
  });
  const created = await client.pageCreate({
    title: params.title,
    handle: params.handle,
    body: params.html,
    isPublished: true,
  });
  console.log("Created Shopify page:", created.id, created.handle);
  return created.id;
}

async function putSecret(params: {
  region: string;
  prefix: string;
  shopId: string;
  token: string;
}): Promise<string> {
  const sm = new SecretsManagerClient({ region: params.region });
  const name = `${params.prefix}/${params.shopId}`;

  try {
    const created = await sm.send(
      new CreateSecretCommand({ Name: name, SecretString: params.token })
    );
    return created.ARN ?? name;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/already exists|ResourceExists/i.test(msg)) throw e;
    await sm.send(
      new PutSecretValueCommand({ SecretId: name, SecretString: params.token })
    );
    return name;
  }
}

async function main() {
  loadEnvFile(".env.production.local");

  const region = process.env.APP_AWS_REGION?.trim() || process.env.AWS_REGION?.trim() || "ap-southeast-2";
  const tableName = process.env.APP_TABLE_NAME?.trim() || "visbuild-shopify-app";
  const secretPrefix = process.env.SHOPIFY_TOKEN_SECRET_PREFIX?.trim() || "visbuild-shopify/token";
  const shopDomain = requireEnv("SHOPIFY_SHOP_DOMAIN");
  const token = requireEnv("SHOPIFY_ACCESS_TOKEN");
  const pageGidInput = process.env.SHOPIFY_PAGE_GID?.trim();

  const shopId = process.env.SEED_SHOP_ID?.trim() || crypto.randomUUID();
  const pageId = process.env.SEED_PAGE_ID?.trim() || crypto.randomUUID();
  const jobId = process.env.SEED_JOB_ID?.trim() || crypto.randomUUID();

  const title = process.env.SEED_PAGE_TITLE?.trim() || "Visbuild Publish Test";
  const handle =
    process.env.SEED_PAGE_HANDLE?.trim() ||
    `visbuild-test-${Date.now().toString(36)}`;

  const visbuildData: Data = {
    content: [
      {
        type: "RawHTML",
        props: {
          html: `<p>Visbuild scheme-C test at ${new Date().toISOString()}</p>`,
          layout: { padding: "0" },
        },
      },
    ],
    root: { props: { title } },
  };
  const html = convertToShopifyBody(visbuildData);

  console.log("1/5 Verify Shopify token...");
  const client = createAdminClient({ shopDomain, accessToken: token });
  const shopName = await client.verifyShop();
  console.log("   Shop:", shopName);

  console.log("2/5 Ensure Shopify page GID...");
  const shopifyPageGid = await ensureShopifyPageGid({
    shopDomain,
    token,
    pageGid: pageGidInput,
    title,
    handle,
    html,
  });

  console.log("3/5 Write Secrets Manager...");
  const secretRef = await putSecret({
    region,
    prefix: secretPrefix,
    shopId,
    token,
  });
  console.log("   Secret:", secretRef);

  const now = new Date().toISOString();
  const runAt = new Date(Date.now() - 60_000).toISOString();
  const versionId = `${pageId}#${Date.now()}#seed`;

  const shop: Shop = {
    id: shopId,
    domain: shopDomain.includes(".") ? shopDomain : `${shopDomain}.myshopify.com`,
    name: shopName,
    tokenSecretRef: secretRef,
    createdAt: now,
    updatedAt: now,
  };

  const index: PageIndex = {
    pageId,
    shopId,
    handle,
    title,
    status: "scheduled",
    shopifyPageGid,
    lastPublishedAt: null,
    pendingJobId: jobId,
    pagePath: handle.startsWith("/") ? handle : `/${handle}`,
    updatedAt: now,
    scheduledPublishAt: runAt,
  };

  const body: PageBody = {
    pageId,
    currentVisbuildData: visbuildData,
    currentHtml: html,
  };

  const version: PageVersion = {
    versionId,
    pageId,
    visbuildData,
    html,
    source: "manual_save",
    createdAt: now,
  };

  const job: PublishJob = {
    jobId,
    pageId,
    shopId,
    payloadVersionId: versionId,
    runAt,
    timezone: "UTC",
    status: "pending",
    attempts: 0,
    maxAttempts: 5,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };

  console.log("4/5 Write DynamoDB records...");
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
    marshallOptions: { removeUndefinedValues: true },
  });

  await doc.send(new PutCommand({ TableName: tableName, Item: shopToItem(shop) }));
  await doc.send(new PutCommand({ TableName: tableName, Item: pageIndexToItem(index) }));
  await doc.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        PK: `PAGE_LOOKUP#${pageId}`,
        SK: "META",
        entity: "page_lookup",
        shopId,
        pageIndexSk: `PAGE#${pageId}`,
      },
    })
  );
  await doc.send(new PutCommand({ TableName: tableName, Item: pageBodyToItem(body) }));
  await doc.send(new PutCommand({ TableName: tableName, Item: versionToItem(version) }));
  await doc.send(new PutCommand({ TableName: tableName, Item: jobToItem(job) }));

  console.log("   shopId:", shopId);
  console.log("   pageId:", pageId);
  console.log("   jobId:", jobId);
  console.log("   versionId:", versionId);
  console.log("   shopifyPageGid:", shopifyPageGid);

  if (process.env.SEED_SKIP_INVOKE === "1") {
    console.log("\nSEED_SKIP_INVOKE=1 — skipped Lambda invoke.");
    return;
  }

  console.log("5/5 Invoke Publish Lambda...");
  const payload = JSON.stringify({ jobId });
  const invoke = spawnSync(
    "aws",
    [
      "lambda",
      "invoke",
      "--function-name",
      "visbuild-shopify-data-publish",
      "--region",
      region,
      "--payload",
      payload,
      "--cli-binary-format",
      "raw-in-base64-out",
      "seed-publish-response.json",
    ],
    { stdio: "inherit", encoding: "utf8" }
  );
  if (invoke.status !== 0) {
    throw new Error(`aws lambda invoke failed (exit ${invoke.status})`);
  }

  console.log("Polling job status...");
  for (let i = 0; i < 12; i++) {
    await sleep(2000);
    const res = await doc.send(
      new GetCommand({
        TableName: tableName,
        Key: { PK: `JOB#${jobId}`, SK: "META" },
      })
    );
    if (!res.Item) continue;
    const j = jobFromItem(res.Item);
    console.log(`   [${i + 1}] status=${j.status} attempts=${j.attempts} error=${j.lastError ?? "-"}`);
    if (j.status === "done" || j.status === "failed" || j.status === "cancelled") {
      if (j.status === "done") {
        console.log("\nOK: Publish job completed. Check Shopify page:", shopifyPageGid);
      } else {
        console.error("\nPublish job ended with:", j.status, j.lastError);
        process.exit(1);
      }
      return;
    }
  }

  console.warn("\nJob still pending/running after poll window. Check CloudWatch Logs for visbuild-shopify-data-publish.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
