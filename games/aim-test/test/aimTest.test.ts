import test from "node:test";
import assert from "node:assert/strict";
import { manifest } from "../src/manifest.js";

test("aim-test manifest scoreConfig is valid", () => {
  assert.equal(manifest.id, "aim-test");
  assert.ok(manifest.scoreConfig);
  assert.equal(manifest.scoreConfig.unit, "ms");
  assert.equal(manifest.scoreConfig.min, 500);
});
