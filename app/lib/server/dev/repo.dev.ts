import { titleFromVisbuildData, toVersionSummaries } from "../../page-version";
import { paginateMediaList } from "../media-pagination.server";
import type {
  MediaAsset,
  PageBody,
  PageIndex,
  PageVersion,
  PublishJob,
  Repo,
  Shop,
  VersionSchedule,
} from "../types";
import { readJsonFile, writeJsonFile } from "./persist";

type Store = {
  shops: Record<string, Shop>;
  pageIndex: Record<string, PageIndex>;
  pageBodies: Record<string, PageBody>;
  versions: Record<string, PageVersion>;
  schedules: Record<string, VersionSchedule>;
  jobs: Record<string, PublishJob>;
  media: Record<string, MediaAsset>;
};

const FILE = "repo.json";

async function load(): Promise<Store> {
  const store = await readJsonFile<Store>(FILE, {
    shops: {},
    pageIndex: {},
    pageBodies: {},
    versions: {},
    schedules: {},
    jobs: {},
    media: {},
  });
  store.schedules ??= {};
  return store;
}

async function save(store: Store): Promise<void> {
  await writeJsonFile(FILE, store);
}

export function createDevRepo(): Repo {
  return {
    async getShop(id) {
      const s = await load();
      return s.shops[id] ?? null;
    },
    async getShopByDomain(domain) {
      const s = await load();
      return Object.values(s.shops).find((sh) => sh.domain === domain) ?? null;
    },
    async listShops() {
      const s = await load();
      return Object.values(s.shops).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    },
    async putShop(shop) {
      const s = await load();
      s.shops[shop.id] = shop;
      await save(s);
    },
    async deleteShop(id) {
      const s = await load();
      delete s.shops[id];
      for (const [pageId, idx] of Object.entries(s.pageIndex)) {
        if (idx.shopId === id) {
          delete s.pageIndex[pageId];
          delete s.pageBodies[pageId];
        }
      }
      await save(s);
    },
    async getPageIndex(pageId) {
      const s = await load();
      return s.pageIndex[pageId] ?? null;
    },
    async getPageByGid(gid) {
      const s = await load();
      return (
        Object.values(s.pageIndex).find((p) => p.shopifyPageGid === gid) ?? null
      );
    },
    async listPagesByShop(shopId) {
      const s = await load();
      return Object.values(s.pageIndex)
        .filter((p) => p.shopId === shopId)
        .sort((a, b) => b.title.localeCompare(a.title));
    },
    async putPageIndex(index) {
      const s = await load();
      s.pageIndex[index.pageId] = index;
      await save(s);
    },
    async patchPageIndex(index, patch) {
      const s = await load();
      const current = s.pageIndex[index.pageId];
      if (!current) throw new Error("Page not found");
      const defined = Object.fromEntries(
        Object.entries(patch).filter(([, value]) => value !== undefined),
      );
      s.pageIndex[index.pageId] = { ...current, ...defined };
      await save(s);
    },
    async deletePage(pageId) {
      const s = await load();
      delete s.pageIndex[pageId];
      delete s.pageBodies[pageId];
      for (const [vid, v] of Object.entries(s.versions)) {
        if (v.pageId === pageId) delete s.versions[vid];
      }
      for (const [vid, schedule] of Object.entries(s.schedules ?? {})) {
        if (schedule.pageId === pageId) delete s.schedules[vid];
      }
      for (const [jid, j] of Object.entries(s.jobs)) {
        if (j.pageId === pageId) delete s.jobs[jid];
      }
      await save(s);
    },
    async getPageBody(pageId) {
      const s = await load();
      return s.pageBodies[pageId] ?? null;
    },
    async putPageBody(body) {
      const s = await load();
      s.pageBodies[body.pageId] = body;
      await save(s);
    },
    async appendPageVersion(version) {
      const s = await load();
      s.versions[version.versionId] = version;
      await save(s);
    },
    async getPageVersion(versionId) {
      const s = await load();
      return s.versions[versionId] ?? null;
    },
    async listPageVersions(pageId) {
      const s = await load();
      return toVersionSummaries(
        Object.values(s.versions)
          .filter((version) => version.pageId === pageId)
          .map((version) => ({
            versionId: version.versionId,
            pageId: version.pageId,
            source: version.source,
            createdAt: version.createdAt,
            title: version.title || titleFromVisbuildData(version.visbuildData),
          })),
      );
    },
    async putVersionSchedule(schedule) {
      const s = await load();
      s.schedules[schedule.versionId] = schedule;
      await save(s);
    },
    async getVersionSchedule(pageId, versionId) {
      const s = await load();
      const schedule = s.schedules[versionId];
      if (!schedule || schedule.pageId !== pageId) return null;
      return schedule;
    },
    async listVersionSchedules(pageId) {
      const s = await load();
      return Object.values(s.schedules).filter((schedule) => schedule.pageId === pageId);
    },
    async deleteVersionSchedule(_pageId, versionId) {
      const s = await load();
      delete s.schedules[versionId];
      await save(s);
    },
    async putJob(job) {
      const s = await load();
      s.jobs[job.jobId] = job;
      await save(s);
    },
    async getJob(jobId) {
      const s = await load();
      return s.jobs[jobId] ?? null;
    },
    async cancelJob(jobId) {
      const s = await load();
      const job = s.jobs[jobId];
      if (!job) return;
      job.status = "cancelled";
      job.updatedAt = new Date().toISOString();
      await save(s);
    },
    async listPendingJobsBefore(isoTime) {
      const s = await load();
      const t = new Date(isoTime).getTime();
      return Object.values(s.jobs).filter(
        (j) =>
          j.status === "pending" && new Date(j.runAt).getTime() <= t
      );
    },
    async putMediaAsset(asset) {
      const s = await load();
      s.media[asset.assetId] = asset;
      await save(s);
    },
    async listMediaAssets(shopId, params) {
      const s = await load();
      const query = params?.query?.trim().toLowerCase();

      let items = Object.values(s.media)
        .filter((a) => a.shopId === shopId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

      if (query) {
        items = items.filter((a) =>
          a.filename.toLowerCase().includes(query),
        );
      }

      const page = paginateMediaList(items, params);
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
