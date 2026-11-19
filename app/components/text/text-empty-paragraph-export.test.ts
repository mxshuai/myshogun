import assert from "node:assert/strict";
import test from "node:test";

import { normalizeEmptyParagraphsForExport } from "./text-empty-paragraph-export";

test("empty p becomes nbsp", () => {
  assert.equal(
    normalizeEmptyParagraphsForExport("<p></p>"),
    "<p>&nbsp;</p>",
  );
});

test("p with br only becomes nbsp", () => {
  assert.equal(
    normalizeEmptyParagraphsForExport('<p><br class="ProseMirror-trailingBreak"></p>'),
    "<p>&nbsp;</p>",
  );
});

test("p keeps style attributes", () => {
  assert.equal(
    normalizeEmptyParagraphsForExport('<p style="text-align: left;"></p>'),
    '<p style="text-align: left;">&nbsp;</p>',
  );
});

test("p with text is unchanged", () => {
  const html = "<p>Hello</p>";
  assert.equal(normalizeEmptyParagraphsForExport(html), html);
});

test("already nbsp is idempotent", () => {
  const html = "<p>&nbsp;</p>";
  assert.equal(normalizeEmptyParagraphsForExport(html), html);
});

test("multiple empty paragraphs", () => {
  assert.equal(
    normalizeEmptyParagraphsForExport("<p></p><p><br></p><p>x</p><p>  </p>"),
    "<p>&nbsp;</p><p>&nbsp;</p><p>x</p><p>&nbsp;</p>",
  );
});

test("empty span inside p becomes nbsp", () => {
  assert.equal(
    normalizeEmptyParagraphsForExport("<p><span></span></p>"),
    "<p>&nbsp;</p>",
  );
});