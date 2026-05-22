import type { Data } from "@puckeditor/core";

export type PageStatus = "draft" | "dirty" | "published" | "scheduled";

export type VersionSource =
  | "manual_save"
  | "publish"
  | "scheduled_publish"
  | "import";

export type JobStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "cancelled";

export interface Shop {
  id: string;
  domain: string;
  name: string;
  tokenSecretRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageIndex {
  pageId: string;
  shopId: string;
  handle: string;
  title: string;
  status: PageStatus;
  shopifyPageGid: string | null;
  lastPublishedAt: string | null;
  pendingJobId: string | null;
}

export interface PageBody {
  pageId: string;
  currentVisbuildData: Data;
  currentHtml: string | null;
}

export interface PageVersion {
  versionId: string;
  pageId: string;
  visbuildData: Data;
  html: string;
  source: VersionSource;
  createdAt: string;
}

export interface PublishJob {
  jobId: string;
  pageId: string;
  shopId: string;
  payloadVersionId: string;
  runAt: string;
  timezone: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Repo {
  getShop(id: string): Promise<Shop | null>;
  listShops(): Promise<Shop[]>;
  putShop(shop: Shop): Promise<void>;
  deleteShop(id: string): Promise<void>;

  getPageIndex(pageId: string): Promise<PageIndex | null>;
  listPagesByShop(shopId: string): Promise<PageIndex[]>;
  putPageIndex(index: PageIndex): Promise<void>;
  deletePage(pageId: string): Promise<void>;

  getPageBody(pageId: string): Promise<PageBody | null>;
  putPageBody(body: PageBody): Promise<void>;

  appendPageVersion(version: PageVersion): Promise<void>;
  getPageVersion(versionId: string): Promise<PageVersion | null>;

  putJob(job: PublishJob): Promise<void>;
  getJob(jobId: string): Promise<PublishJob | null>;
  cancelJob(jobId: string): Promise<void>;
  listPendingJobsBefore(isoTime: string): Promise<PublishJob[]>;
}

export interface SecretsStore {
  getShopToken(shopId: string): Promise<string | null>;
  setShopToken(shopId: string, token: string): Promise<string>;
}

export interface Scheduler {
  scheduleAt(params: { jobId: string; runAt: Date }): Promise<void>;
  cancel(jobId: string): Promise<void>;
}

export interface ServerContext {
  repo: Repo;
  secrets: SecretsStore;
  scheduler: Scheduler;
}
