import type { Data } from "@puckeditor/core";

export type PageStatus =
  | "draft"
  | "dirty"
  | "published"
  | "scheduled"
  | "unpublished";

export type VersionSource = "manual_save" | "publish" | "import";

export type JobStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "cancelled";

export type JobKind = "publish" | "unpublish";

export type ScheduleStatus =
  | "pending"
  | "live"
  | "ended"
  | "cancelled"
  | "failed";

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
  /** Version currently shown on Shopify, or null when the page is hidden. */
  liveVersionId: string | null;
  /** Latest publish-only version. Restored when a bounded window ends. */
  evergreenVersionId: string | null;
  /** Last manual unpublish. Evergreen candidates published before it are ignored. */
  evergreenClearedAt: string | null;
  /** URL path used by the visual editor, e.g. "/" or "/about". */
  pagePath: string;
  /** ISO timestamp of last edit, used for list sorting / display. */
  updatedAt: string;
  /** ISO timestamp of the next pending version publish, or null. */
  scheduledPublishAt: string | null;
}

export type PageIndexPatch = Partial<Omit<PageIndex, "pageId" | "shopId">>;

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
  /** Denormalized editor title so version lists do not load the document. */
  title: string;
  createdAt: string;
}

/** One publish/unpublish window for a single page version. */
export interface VersionSchedule {
  versionId: string;
  pageId: string;
  shopId: string;
  /** Minute-precision ISO time. */
  publishAt: string;
  /** Null means the version stays live as the evergreen version. */
  unpublishAt: string | null;
  timezone: string;
  publishJobId: string | null;
  unpublishJobId: string | null;
  status: ScheduleStatus;
  publishedAt: string | null;
  unpublishedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

/** History row for the title dropdown. Newest first; versionNumber is oldest-kept = 1. */
export interface PageVersionSummary {
  versionId: string;
  pageId: string;
  source: VersionSource;
  createdAt: string;
  title: string;
  versionNumber: number;
}

export interface PublishJob {
  jobId: string;
  pageId: string;
  shopId: string;
  payloadVersionId: string;
  kind: JobKind;
  runAt: string;
  timezone: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  assetId: string;
  shopId: string;
  url: string;
  filename: string;
  contentType: string;
  size: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export type MediaAssetsPage = {
  assets: MediaAsset[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export interface Repo {
  getShop(id: string): Promise<Shop | null>;
  getShopByDomain(domain: string): Promise<Shop | null>;
  listShops(): Promise<Shop[]>;
  putShop(shop: Shop): Promise<void>;
  deleteShop(id: string): Promise<void>;

  getPageIndex(pageId: string): Promise<PageIndex | null>;
  getPageByGid(gid: string): Promise<PageIndex | null>;
  listPagesByShop(shopId: string): Promise<PageIndex[]>;
  putPageIndex(index: PageIndex): Promise<void>;
  /** Field-level update so concurrent writers do not overwrite each other's fields. */
  patchPageIndex(
    index: Pick<PageIndex, "pageId" | "shopId">,
    patch: PageIndexPatch,
  ): Promise<void>;
  deletePage(pageId: string): Promise<void>;

  getPageBody(pageId: string): Promise<PageBody | null>;
  putPageBody(body: PageBody): Promise<void>;

  appendPageVersion(version: PageVersion): Promise<void>;
  getPageVersion(versionId: string): Promise<PageVersion | null>;
  listPageVersions(pageId: string): Promise<PageVersionSummary[]>;

  putVersionSchedule(schedule: VersionSchedule): Promise<void>;
  getVersionSchedule(
    pageId: string,
    versionId: string,
  ): Promise<VersionSchedule | null>;
  listVersionSchedules(pageId: string): Promise<VersionSchedule[]>;
  deleteVersionSchedule(pageId: string, versionId: string): Promise<void>;

  putJob(job: PublishJob): Promise<void>;
  getJob(jobId: string): Promise<PublishJob | null>;
  cancelJob(jobId: string): Promise<void>;
  listPendingJobsBefore(isoTime: string): Promise<PublishJob[]>;

  putMediaAsset(asset: MediaAsset): Promise<void>;
  listMediaAssets(
    shopId: string,
    params?: {
      limit?: number;
      page?: number;
      query?: string;
      firstPageLimit?: number;
    },
  ): Promise<MediaAssetsPage>;
}

export interface SecretsStore {
  getShopToken(shopId: string): Promise<string | null>;
  setShopToken(shopId: string, token: string): Promise<string>;
}

export interface Scheduler {
  scheduleAt(params: {
    jobId: string;
    runAt: Date;
    /** IANA timezone for the one-time `at()` expression, e.g. Asia/Shanghai */
    timezone?: string;
  }): Promise<void>;
  cancel(jobId: string): Promise<void>;
}

export interface ServerContext {
  repo: Repo;
  secrets: SecretsStore;
  scheduler: Scheduler;
}
