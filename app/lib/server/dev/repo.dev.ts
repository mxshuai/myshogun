import type {
  PageBody,
  PageIndex,
  PageVersion,
  PublishJob,
  Repo,
  Shop,
} from "../types";
import { readJsonFile, writeJsonFile } from "./persist";

type Store = {
  shops: Record<string, Shop>;
  pageIndex: Record<string, PageIndex>;
  pageBodies: Record<string, PageBody>;
  versions: Record<string, PageVersion>;
  jobs: Record<string, PublishJob>;
};

const FILE = "repo.json";

async function load(): Promise<Store> {
  return readJsonFile<Store>(FILE, {
    shops: {},
    pageIndex: {},
    pageBodies: {},
    versions: {},
    jobs: {},
  });
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
    async deletePage(pageId) {
      const s = await load();
      delete s.pageIndex[pageId];
      delete s.pageBodies[pageId];
      for (const [vid, v] of Object.entries(s.versions)) {
        if (v.pageId === pageId) delete s.versions[vid];
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
  };
}
