import test from "node:test";
import assert from "node:assert/strict";
import { manifest } from "../src/manifest.js";
import {
  calculateAverageMs,
  generateRandomPercentagePos,
  getTargetSizePx,
  TOTAL_TARGETS,
} from "../src/logic.js";

test("aim-test manifest scoreConfig is valid", () => {
  assert.equal(manifest.id, "aim-test");
  assert.ok(manifest.scoreConfig);
  assert.equal(manifest.scoreConfig.unit, "ms");
  assert.equal(manifest.scoreConfig.min, 500);
});

test("calculateAverageMs calculates average reaction per target accurately", () => {
  const avg = calculateAverageMs(15000, 30);
  assert.equal(avg, 500);

  const zeroAvg = calculateAverageMs(0, 0);
  assert.equal(zeroAvg, 0);
});

test("generateRandomPercentagePos returns valid percentage bounds", () => {
  const pos = generateRandomPercentagePos();
  assert.ok(pos.xPercent >= 10 && pos.xPercent <= 90);
  assert.ok(pos.yPercent >= 10 && pos.yPercent <= 90);
  assert.equal(TOTAL_TARGETS, 30);
});

test("aim-test manifest declares normal/hard difficulty with a valid default", () => {
  assert.ok(manifest.difficulty);
  const ids = manifest.difficulty.levels.map((l) => l.id);
  assert.deepEqual(ids, ["normal", "hard"]);
  assert.ok(ids.includes(manifest.difficulty.defaultLevelId));
});

test("getTargetSizePx: hard is smaller than normal, unknown ids fall back to normal", () => {
  const normal = getTargetSizePx("normal");
  const hard = getTargetSizePx("hard");
  assert.ok(hard < normal);
  assert.equal(getTargetSizePx("unknown-tier"), normal);
});
