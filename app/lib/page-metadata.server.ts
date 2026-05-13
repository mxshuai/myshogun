import fs from "fs/promises";

import {
  ensureShogunDataDirectory,
  getPageMetadataPath,
} from "./data-paths.server";

export type PageStatus = "draft" | "published" | "scheduled";

export type PageMetaEntry = {
  status: PageStatus;
  updatedAt: string;
  scheduledPublishAt?: string | null;
};

export async function readMetadata(): Promise<Record<string, PageMetaEntry>> {
  try {
    const file = await fs.readFile(getPageMetadataPath(), "utf8");
    return JSON.parse(file) as Record<string, PageMetaEntry>;
  } catch {
    return {};
  }
}

async function writeMetadata(meta: Record<string, PageMetaEntry>) {
  await ensureShogunDataDirectory();
  await fs.writeFile(getPageMetadataPath(), JSON.stringify(meta, null, 2), {
    encoding: "utf8",
  });
}

function nowIso() {
  return new Date().toISOString();
}

export async function touchPageMetadata(path: string) {
  const meta = await readMetadata();
  const prev = meta[path];
  meta[path] = {
    status: prev?.status ?? "draft",
    updatedAt: nowIso(),
    scheduledPublishAt:
      prev?.scheduledPublishAt !== undefined
        ? prev.scheduledPublishAt
        : null,
  };
  await writeMetadata(meta);
}

export async function deletePageMetadata(path: string) {
  const meta = await readMetadata();
  if (!meta[path]) return;
  delete meta[path];
  await writeMetadata(meta);
}

/** 随页面路径重命名元数据条目（用于编辑器修改 URL path） */
export async function renamePageMetadata(from: string, to: string) {
  if (from === to) return;
  const meta = await readMetadata();
  const entry = meta[from];
  delete meta[from];
  if (entry) meta[to] = entry;
  await writeMetadata(meta);
}

export async function upsertPageMetadata(
  path: string,
  patch: Partial<PageMetaEntry>
) {
  const meta = await readMetadata();
  const prev = meta[path];
  meta[path] = {
    status: patch.status ?? prev?.status ?? "draft",
    updatedAt: patch.updatedAt ?? prev?.updatedAt ?? nowIso(),
    scheduledPublishAt:
      patch.scheduledPublishAt !== undefined
        ? patch.scheduledPublishAt
        : prev?.scheduledPublishAt ?? null,
  };
  await writeMetadata(meta);
}

export async function setPagePublished(path: string) {
  await upsertPageMetadata(path, {
    status: "published",
    updatedAt: nowIso(),
    scheduledPublishAt: null,
  });
}

export async function setPageScheduled(path: string, scheduledPublishAt: string) {
  await upsertPageMetadata(path, {
    status: "scheduled",
    updatedAt: nowIso(),
    scheduledPublishAt,
  });
}

/** 数据库里有页面但尚无元数据时用于补齐默认项（不写盘，仅合并视图） */
export function mergeMetaWithDefaults(
  pathKey: string,
  meta: Record<string, PageMetaEntry>
): PageMetaEntry {
  const m = meta[pathKey];
  if (m) return m;
  return {
    status: "draft",
    updatedAt: new Date(0).toISOString(),
    scheduledPublishAt: null,
  };
}
