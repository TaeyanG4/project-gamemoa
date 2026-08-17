import test from "node:test";
import assert from "node:assert/strict";
import { validateScorePayload } from "../src/domain/scoreValidation.js";

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

test("validateScorePayload rejects any gameId absent from the built-in registry, regardless of score (2026-08-17 beta hardening)", () => {
  // Sandbox game slugs are never in the static built-in registry, and score submission for them
  // is explicitly unsupported for now — this must reject outright, not fall back to a loose
  // "0..1,000,000" bound (the old behavior, which let an unrecognized/sandbox game id through).
  for (const score of [0, 1, 500, 999999, 1000000]) {
    const result = validateScorePayload("some-sandbox-game-slug", score);
    assert.equal(result.valid, false, `score ${score} for an unknown game must be rejected`);
  }
});
