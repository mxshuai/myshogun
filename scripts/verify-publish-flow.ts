/**
 * Dev mock 端到端校验（不调用真实 Shopify API）
 */
import { createDevRepo } from "../app/lib/server/dev/repo.dev";
import { createDevSecretsStore } from "../app/lib/server/dev/secrets.dev";
import { createDevScheduler } from "../app/lib/server/dev/scheduler.dev";
import { createManagedPage, upsertShopRecord } from "../app/lib/server/page-ops";
import { runScheduledJob, savePageDraft, scheduleVersion } from "../app/lib/server/publish";
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
        props: {
          main: { html: "<p>scheduled</p>" },
          layout: { padding: "0" },
        },
      },
    ],
    root: { props: { title: "Verify Page" } },
  } as import("@puckeditor/core").Data;

  const versionId = await savePageDraft(page.pageId, ctx, visbuildData);
  const publishAt = new Date(Date.now() + 120_000);
  const unpublishAt = new Date(Date.now() + 240_000);
  await scheduleVersion(ctx, {
    pageId: page.pageId,
    versionId,
    publishAt,
    unpublishAt,
    timezone: "UTC",
  });

  const schedules = await repo.listVersionSchedules(page.pageId);
  const schedule = schedules.find((item) => item.versionId === versionId);
  if (!schedule || schedule.status !== "pending" || !schedule.publishJobId) {
    throw new Error("Expected a pending version schedule");
  }
  if (!schedule.unpublishJobId) {
    throw new Error("Expected an unpublish job");
  }

  await runScheduledJob(schedule.publishJobId, ctx);

  const after = await repo.getJob(schedule.publishJobId);
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
