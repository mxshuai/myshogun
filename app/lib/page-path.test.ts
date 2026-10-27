import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canonicalPagePath,
  decodePathname,
  literalPagePath,
  slugFromTitle,
} from "./page-path";
import { resolveShopVisbuildPath, resolveVisbuildPath } from "./resolve-visbuild-path.server";
import { shopEditPath, shopPublicPath } from "./shop-url";

test("slug matches the page-name preview", () => {
  assert.equal(
    slugFromTitle("asd asd-aaaa assd asd%aaaa"),
    "asd-asd-aaaa-assd-asd-aaaa",
  );
});

test("spaces and a literal percent-20 canonicalize to the same path", () => {
  assert.equal(canonicalPagePath("rui test 1027"), "/rui-test-1027");
  assert.equal(canonicalPagePath("/rui%20test%201027"), "/rui-test-1027");
});

test("trailing hyphen is removed only when the path is canonicalized", () => {
  assert.equal(canonicalPagePath("my-"), "/my");
});

test("slashes stay as segments", () => {
  assert.equal(canonicalPagePath("foo/bar baz"), "/foo/bar-baz");
});

test("root, empty, and parent segments are rejected", () => {
  assert.equal(canonicalPagePath("/"), null);
  assert.equal(canonicalPagePath("%%%"), null);
  assert.equal(canonicalPagePath("/../x"), null);
  assert.equal(canonicalPagePath("a//b"), null);
});

test("literal paths keep spaces and encoded text", () => {
  assert.equal(literalPagePath("rui test 1027"), "/rui test 1027");
  assert.equal(literalPagePath("/rui%20test%201027"), "/rui%20test%201027");
});

test("pathname segments are decoded once", () => {
  assert.equal(decodePathname("/rui%20test%201027/edit"), "/rui test 1027/edit");
  assert.equal(
    decodePathname("/rui%2520test%25201027/edit"),
    "/rui%20test%201027/edit",
  );
});

test("resolver does not re-encode spaces", () => {
  assert.deepEqual(resolveVisbuildPath("/rui test 1027/edit"), {
    isEditorRoute: true,
    path: "/rui test 1027",
  });
  assert.deepEqual(resolveVisbuildPath("/rui%20test%201027/edit"), {
    isEditorRoute: true,
    path: "/rui%20test%201027",
  });
  assert.deepEqual(resolveVisbuildPath("/edit"), {
    isEditorRoute: true,
    path: "/",
  });
});

test("shop request URL decodes once before lookup", () => {
  assert.deepEqual(
    resolveShopVisbuildPath(
      "https://app.example/shop/demo.myshopify.com/rui%20test%201027/edit",
      "demo.myshopify.com",
    ),
    { isEditorRoute: true, path: "/rui test 1027" },
  );
  assert.deepEqual(
    resolveShopVisbuildPath(
      "https://app.example/shop/demo.myshopify.com/rui%2520test%25201027/edit",
      "demo.myshopify.com",
    ),
    { isEditorRoute: true, path: "/rui%20test%201027" },
  );
});

test("edit and public links encode each segment", () => {
  assert.equal(
    shopEditPath("demo.myshopify.com", "/rui test 1027"),
    "/shop/demo.myshopify.com/rui%20test%201027/edit",
  );
  assert.equal(
    shopEditPath("demo.myshopify.com", "/rui%20test%201027"),
    "/shop/demo.myshopify.com/rui%2520test%25201027/edit",
  );
  assert.equal(
    shopPublicPath("demo.myshopify.com", "/"),
    "/shop/demo.myshopify.com/",
  );
});
