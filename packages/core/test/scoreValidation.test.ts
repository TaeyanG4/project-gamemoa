import test from "node:test";
import assert from "node:assert/strict";
import { validateScorePayload } from "../src/scores/scoreValidation.js";

test("validateScorePayload validates reaction-time scores", () => {
  assert.equal(validateScorePayload("reaction-time", 200).valid, true);
  assert.equal(validateScorePayload("reaction-time", 10).valid, false); // impossible bot reaction
  assert.equal(validateScorePayload("reaction-time", 15000).valid, false); // too slow
});

test("validateScorePayload validates memory-test levels", () => {
  assert.equal(validateScorePayload("memory-test", 12).valid, true);
  assert.equal(validateScorePayload("memory-test", 0).valid, false);
  assert.equal(validateScorePayload("memory-test", 100).valid, false);
});

test("validateScorePayload validates aim-test scores automatically", () => {
  assert.equal(validateScorePayload("aim-test", 1500).valid, true);
  assert.equal(validateScorePayload("aim-test", 100).valid, false); // below min 500ms
});

test("validateScorePayload rejects negative scores and NaNs", () => {
  assert.equal(validateScorePayload("reaction-time", -5).valid, false);
  assert.equal(validateScorePayload("reaction-time", NaN).valid, false);
  assert.equal(validateScorePayload("reaction-time", 12.34).valid, false);
});
