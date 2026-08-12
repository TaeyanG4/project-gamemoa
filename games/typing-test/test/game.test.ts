import test from "node:test";
import assert from "node:assert/strict";
import { manifest } from "../src/manifest.js";

test("typing-test manifest has valid scoreConfig", () => {
  assert.equal(manifest.id, "typing-test");
  assert.ok(manifest.scoreConfig);
  assert.equal(manifest.scoreConfig.unit, "WPM");
  assert.equal(manifest.scoreConfig.direction, "desc");
});
