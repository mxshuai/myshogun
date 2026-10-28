import assert from "node:assert/strict";
import { test } from "node:test";

import type { Data } from "@puckeditor/core";

import { visbuildDataEqual } from "./visbuild-data-equal";

test("visbuildDataEqual ignores object key order", () => {
  const a = { root: { props: { title: "A", pagePath: "/x" } }, content: [] } as Data;
  const b = { content: [], root: { props: { pagePath: "/x", title: "A" } } } as Data;
  assert.equal(visbuildDataEqual(a, b), true);
});
