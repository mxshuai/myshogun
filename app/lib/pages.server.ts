import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import type { Data } from "@puckeditor/core";

import {
  deletePageMetadata,
  mergeMetaWithDefaults,
  readMetadata,
  renamePageMetadata,
  touchPageMetadata,
  upsertPageMetadata,
} from "./page-metadata.server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const databasePath = path.join(__dirname, "..", "..", "database.json");

export async function getPage(pagePath: string) {
  const pages = await readDatabase();
  return pages[pagePath];
}

export async function savePage(pagePath: string, data: Data) {
  const pages = await readDatabase();
  pages[pagePath] = data;
  await fs.writeFile(databasePath, JSON.stringify(pages), { encoding: "utf8" });
  await touchPageMetadata(pagePath);
}

/** 与列表「新建页」一致：前导 /，禁止 .. 与 // */
export function normalizeEditorPagePath(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;
  if (!s.startsWith("/")) s = `/${s}`;
  if (s.includes("..") || s.includes("//")) return null;
  while (s.length > 1 && s.endsWith("/")) {
    s = s.slice(0, -1);
  }
  return s;
}

async function renamePageRecord(
  fromPath: string,
  toPath: string
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (fromPath === toPath) return { ok: true, path: toPath };
  if (fromPath === "/") {
    return { ok: false, error: "Home page path cannot be changed" };
  }
  if (toPath === "/") {
    return { ok: false, error: "Path / is reserved for the home page" };
  }
  const pages = await readDatabase();
  if (!pages[fromPath]) return { ok: false, error: "Page not found" };
  if (pages[toPath]) {
    return { ok: false, error: "A page with this path already exists" };
  }
  pages[toPath] = pages[fromPath];
  delete pages[fromPath];
  await fs.writeFile(databasePath, JSON.stringify(pages), { encoding: "utf8" });
  await renamePageMetadata(fromPath, toPath);
  return { ok: true, path: toPath };
}

/** 保存编辑器内容；若 pagePath 与当前 URL 不一致则先写入再重命名存储键 */
export async function saveEditorPage(
  currentPath: string,
  data: Data,
  desiredPathRaw: string
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const desired = normalizeEditorPagePath(desiredPathRaw);
  if (desired === null) {
    return { ok: false, error: "Invalid URL path" };
  }

  await savePage(currentPath, data);

  if (desired === currentPath) {
    return { ok: true, path: currentPath };
  }

  return renamePageRecord(currentPath, desired);
}

async function readDatabase() {
  try {
    const file = await fs.readFile(databasePath, "utf8");
    return JSON.parse(file) as Record<string, Data>;
  } catch (error: unknown) {
    console.error(error);
    return {};
  }
}

export async function readAllPages(): Promise<Record<string, Data>> {
  return readDatabase();
}

export async function deletePage(pagePath: string) {
  const pages = await readDatabase();
  if (!(pagePath in pages)) return false;
  delete pages[pagePath];
  await fs.writeFile(databasePath, JSON.stringify(pages), { encoding: "utf8" });
  await deletePageMetadata(pagePath);
  return true;
}

export async function createPage(
  pagePath: string,
  title: string
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const p = pagePath.trim();
  if (!p.startsWith("/") || p.includes("..")) {
    return { ok: false, error: "Invalid URL path" };
  }
  if (p === "/") {
    return { ok: false, error: "Path / is reserved for the home page" };
  }
  const pages = await readDatabase();
  if (pages[p]) {
    return { ok: false, error: "A page with this path already exists" };
  }
  const data: Data = {
    content: [],
    root: {
      props: {
        title: title.trim() || "Untitled",
        pagePath: p,
      },
    },
  };
  await savePage(p, data);
  return { ok: true, path: p };
}

function nextDuplicatePath(
  pagePath: string,
  pages: Record<string, Data>
): string {
  const trimmed = pagePath.replace(/\/$/, "") || "/";
  if (trimmed === "/") {
    let candidate = "/home-copy";
    while (pages[candidate]) {
      candidate = `${candidate}-copy`;
    }
    return candidate;
  }
  let candidate = `${trimmed}-copy`;
  while (pages[candidate]) {
    candidate = `${candidate}-copy`;
  }
  return candidate;
}

export async function duplicatePage(pagePath: string): Promise<string | null> {
  const pages = await readDatabase();
  const data = pages[pagePath];
  if (!data) return null;

  const newPath = nextDuplicatePath(pagePath, pages);

  const clone = structuredClone(data) as Data;
  const props = clone.root?.props as { title?: string } | undefined;
  const rawTitle = props?.title?.trim() ?? "";
  const fallbackName =
    pagePath === "/" ? "Home" : pagePath.replace(/^\//, "") || "Page";
  const sourceTitle = rawTitle || fallbackName;

  clone.root = {
    ...clone.root,
    props: {
      ...(clone.root?.props as object),
      title: `Copy of ${sourceTitle}`,
      pagePath: newPath,
    },
  };

  pages[newPath] = clone;
  await fs.writeFile(databasePath, JSON.stringify(pages), { encoding: "utf8" });
  await upsertPageMetadata(newPath, {
    status: "draft",
    updatedAt: new Date().toISOString(),
    scheduledPublishAt: null,
  });
  return newPath;
}

export type ShogunPageSummary = {
  path: string;
  title: string;
  displayPath: string;
  status: import("./page-metadata.server").PageStatus;
  updatedAt: string;
  scheduledPublishAt: string | null;
};

export async function listShogunPageSummaries(): Promise<ShogunPageSummary[]> {
  const pages = await readDatabase();
  const meta = await readMetadata();
  const keys = Object.keys(pages).sort();

  const rows: ShogunPageSummary[] = keys.map((p) => {
    const data = pages[p]!;
    const title =
      (data.root?.props as { title?: string })?.title?.trim() || "";
    const displayTitle =
      title ||
      (p === "/" ? "Home" : p.replace(/^\//, "") || "Untitled");
    const merged = mergeMetaWithDefaults(p, meta);
    return {
      path: p,
      title: displayTitle,
      displayPath: p === "/" ? "/" : p,
      status: merged.status,
      updatedAt: merged.updatedAt,
      scheduledPublishAt: merged.scheduledPublishAt ?? null,
    };
  });

  rows.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  return rows;
}
