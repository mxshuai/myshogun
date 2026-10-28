import assert from "node:assert/strict";
import { test } from "node:test";

import { toVersionSummaries } from "./page-version";
import type { VersionListRow } from "./page-version";

function version(id: string, createdAt: string, title: string): VersionListRow {
  return {
    versionId: id,
    pageId: "page",
    source: "manual_save",
    createdAt,
    title,
  };
}

test("version list is newest first and numbers from the oldest retained", () => {
  const rows = toVersionSummaries([
    version("b", "2026-10-27T02:00:00.000Z", "Second"),
    version("a", "2026-10-27T01:00:00.000Z", "First"),
    version("c", "2026-10-27T03:00:00.000Z", ""),
  ]);
  assert.deepEqual(
    rows.map((row) => [row.versionNumber, row.title]),
    [
      [3, "Untitled"],
      [2, "Second"],
      [1, "First"],
    ],
  );
});
