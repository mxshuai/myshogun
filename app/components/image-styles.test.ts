import assert from "node:assert/strict";
import test from "node:test";

import {
  buildImageDimensionalStyle,
  buildImageFrameStyle,
  isNaturalImageLayout,
  type ImageDimensionsGroup,
} from "./image-styles";

const naturalDefaults: ImageDimensionsGroup = {
  minHeight: 0,
  maxWidth: 0,
  imageFit: "natural",
  imagePosition: "center center",
  zoom: 0,
  aspectRatio: "auto",
};

test("isNaturalImageLayout is true for default natural dimensions", () => {
  assert.equal(isNaturalImageLayout(naturalDefaults), true);
});

test("isNaturalImageLayout is false when imageFit is cover", () => {
  assert.equal(
    isNaturalImageLayout({ ...naturalDefaults, imageFit: "cover" }),
    false,
  );
});

test("isNaturalImageLayout is false with fixed height", () => {
  assert.equal(
    isNaturalImageLayout({ ...naturalDefaults, height: 200 }),
    false,
  );
});

test("isNaturalImageLayout is false with fixed aspect ratio", () => {
  assert.equal(
    isNaturalImageLayout({ ...naturalDefaults, aspectRatio: "16/9" }),
    false,
  );
});

test("natural frame uses flex column center align", () => {
  const style = buildImageFrameStyle(naturalDefaults);
  assert.equal(style.display, "flex");
  assert.equal(style.flexDirection, "column");
  assert.equal(style.alignItems, "center");
  assert.equal(style.width, "100%");
});

test("natural img uses intrinsic width capped at container", () => {
  const style = buildImageDimensionalStyle(naturalDefaults);
  assert.equal(style.width, "auto");
  assert.equal(style.maxWidth, "100%");
  assert.equal(style.height, "auto");
  assert.equal("objectFit" in style, false);
});

test("cover mode img keeps width 100% and object-fit", () => {
  const style = buildImageDimensionalStyle({
    ...naturalDefaults,
    imageFit: "cover",
  });
  assert.equal(style.width, "100%");
  assert.equal(style.objectFit, "cover");
});