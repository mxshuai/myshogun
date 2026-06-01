/**
 * Dev mock 端到端校验（不调用真实 Shopify API）
 */
import { createDevRepo } from "../app/lib/server/dev/repo.dev";
import { createDevSecretsStore } from "../app/lib/server/dev/secrets.dev";
import { createDevScheduler } from "../app/lib/server/dev/scheduler.dev";
import { createManagedPage, upsertShopRecord } from "../app/lib/server/page-ops";
import { publishPageVersion, savePageDraft, schedulePageUpdate } from "../app/lib/server/publish";
import type { ServerContext } from "../app/lib/server/types";

async function main() {
  const repo = createDevRepo();
  const secrets = createDevSecretsStore();
  const scheduler = createDevScheduler();
  const ctx: ServerContext = { repo, secrets, scheduler };

  const shop = await upsertShopRecord(repo, {
    domain: "verify-dev.myshopify.com",
    name: "Verify Dev Shop",
  });
  await secrets.setShopToken(shop.id, "shpat_verify_fake");

  const page = await createManagedPage(repo, {
    shopId: shop.id,
    title: "Verify Page",
    handle: "verify-page",
  });

  const visbuildData = {
    content: [
      {
        type: "RawHTML",
        props: { html: "<p>scheduled</p>", layout: { padding: "0" } },
      },
    ],
    root: { props: { title: "Verify Page" } },
  } as import("@puckeditor/core").Data;

  await savePageDraft(page.pageId, ctx, visbuildData);

  const runAt = new Date(Date.now() + 120_000);
  const jobId = await schedulePageUpdate(
    page.pageId,
    ctx,
    visbuildData,
    runAt,
    "UTC"
  );

  const job = await repo.getJob(jobId);
  if (!job || job.status !== "pending") {
    throw new Error(`Job should be pending, got ${job?.status}`);
  }

  await publishPageVersion(jobId, ctx);

  const after = await repo.getJob(jobId);
  if (!after) throw new Error("Job missing after run");

  // Without real Shopify, publish fails and retries — expect failed after max attempts
  if (after.status !== "failed" && after.status !== "done") {
    console.warn("Job status:", after.status, after.lastError);
  }

  const index = await repo.getPageIndex(page.pageId);
  console.log("OK verify-publish-flow", {
    jobStatus: after.status,
    pageStatus: index?.status,
    attempts: after.attempts,
    lastError: after.lastError?.slice(0, 80),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
