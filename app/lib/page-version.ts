import type { Data } from "@puckeditor/core";

import type { PageVersionSummary, VersionSource } from "./server/types";

export type VersionListRow = {
  versionId: string;
  pageId: string;
  source: VersionSource;
  createdAt: string;
  title: string;
};

export function titleFromVisbuildData(data: Data | null | undefined): string {
  const title = (data?.root?.props as { title?: string } | undefined)?.title;
  return title?.trim() ? title.trim() : "Untitled";
}

/** Newest first. Version 1 is the oldest version still retained. */
export function toVersionSummaries(versions: VersionListRow[]): PageVersionSummary[] {
  const chronological = [...versions].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );
  const numberById = new Map(
    chronological.map((version, index) => [version.versionId, index + 1]),
  );
  return [...chronological].reverse().map((version) => ({
    versionId: version.versionId,
    pageId: version.pageId,
    source: version.source,
    createdAt: version.createdAt,
    title: version.title?.trim() ? version.title.trim() : "Untitled",
    versionNumber: numberById.get(version.versionId) ?? 1,
  }));
}
