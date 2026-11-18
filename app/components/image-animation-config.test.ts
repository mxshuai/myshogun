import assert from "node:assert/strict";
import test from "node:test";

import { buildAnimateClasses } from "./image-animation-config";

test("buildAnimateClasses maps fadeInDown with delay", () => {
  const classes = buildAnimateClasses("fadeInDown", {
    delay: "2s",
    duration: "default",
    iterationCount: "once",
    triggerOnce: false,
  });
  assert.deepEqual(classes, [
    "animate__animated",
    "animate__fadeInDown",
    "animate__delay-2s",
  ]);
});

test("buildAnimateClasses returns empty for none", () => {
  assert.deepEqual(buildAnimateClasses("none"), []);
});