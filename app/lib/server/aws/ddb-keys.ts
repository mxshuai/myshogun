import type {
  PageBody,
  PageIndex,
  PageVersion,
  PublishJob,
  Shop,
} from "../types";

export const GSI1_NAME = "GSI1";

export function shopPk(shopId: string) {
  return `SHOP#${shopId}`;
}

export function pagePk(pageId: string) {
  return `PAGE#${pageId}`;
}

export function jobPk(jobId: string) {
  return `JOB#${jobId}`;
}

export function shopToItem(shop: Shop) {
  return {
    PK: shopPk(shop.id),
    SK: "META",
    entity: "shop",
    ...shop,
  };
}

export function shopFromItem(item: Record<string, unknown>): Shop {
  return {
    id: String(item.id),
    domain: String(item.domain),
    name: String(item.name),
    tokenSecretRef: String(item.tokenSecretRef),
    createdAt: String(item.createdAt),
    updatedAt: String(item.updatedAt),
  };
}

export function pageIndexToItem(index: PageIndex) {
  return {
    PK: shopPk(index.shopId),
    SK: `PAGE#${index.pageId}`,
    entity: "page_index",
    ...index,
  };
}

export function pageIndexFromItem(item: Record<string, unknown>): PageIndex {
  const handle = String(item.handle);
  return {
    pageId: String(item.pageId),
    shopId: String(item.shopId),
    handle,
    title: String(item.title),
    status: item.status as PageIndex["status"],
    shopifyPageGid: item.shopifyPageGid
      ? String(item.shopifyPageGid)
      : null,
    lastPublishedAt: item.lastPublishedAt
      ? String(item.lastPublishedAt)
      : null,
    pendingJobId: item.pendingJobId ? String(item.pendingJobId) : null,
    // Backfill defaults for records written before these fields existed.
    pagePath: item.pagePath ? String(item.pagePath) : `/${handle}`,
    updatedAt: item.updatedAt
      ? String(item.updatedAt)
      : new Date(0).toISOString(),
    scheduledPublishAt: item.scheduledPublishAt
      ? String(item.scheduledPublishAt)
      : null,
  };
}

export function pageBodyToItem(body: PageBody) {
  return {
    PK: pagePk(body.pageId),
    SK: "META",
    entity: "page_body",
    pageId: body.pageId,
    currentVisbuildData: body.currentVisbuildData,
    currentHtml: body.currentHtml,
  };
}

export function pageBodyFromItem(item: Record<string, unknown>): PageBody {
  return {
    pageId: String(item.pageId),
    currentVisbuildData: item.currentVisbuildData as PageBody["currentVisbuildData"],
    currentHtml: item.currentHtml ? String(item.currentHtml) : null,
  };
}

export function versionToItem(version: PageVersion) {
  return {
    PK: pagePk(version.pageId),
    SK: `VERSION#${version.versionId}`,
    entity: "version",
    ...version,
  };
}

export function versionFromItem(item: Record<string, unknown>): PageVersion {
  return {
    versionId: String(item.versionId),
    pageId: String(item.pageId),
    visbuildData: item.visbuildData as PageVersion["visbuildData"],
    html: String(item.html),
    source: item.source as PageVersion["source"],
    createdAt: String(item.createdAt),
  };
}

export function jobToItem(job: PublishJob) {
  return {
    PK: jobPk(job.jobId),
    SK: "META",
    entity: "job",
    GSI1PK: "JOB_STATUS#pending",
    GSI1SK: job.runAt,
    ...job,
  };
}

export function jobFromItem(item: Record<string, unknown>): PublishJob {
  return {
    jobId: String(item.jobId),
    pageId: String(item.pageId),
    shopId: String(item.shopId),
    payloadVersionId: String(item.payloadVersionId),
    runAt: String(item.runAt),
    timezone: String(item.timezone),
    status: item.status as PublishJob["status"],
    attempts: Number(item.attempts ?? 0),
    maxAttempts: Number(item.maxAttempts ?? 5),
    lastError: item.lastError ? String(item.lastError) : null,
    createdAt: String(item.createdAt),
    updatedAt: String(item.updatedAt),
  };
}
