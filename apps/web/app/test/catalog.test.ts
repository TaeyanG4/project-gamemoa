import test from "node:test";
import assert from "node:assert/strict";
import { GAME_MANIFESTS, GAME_MANIFEST_MAP, validateScoreByManifest } from "@owogg/core";

test("Game Catalog manifests contain published games", () => {
  assert.ok(GAME_MANIFESTS.length >= 2);
  assert.equal(GAME_MANIFEST_MAP["reaction-time"]?.title, "반응속도 테스트");
  assert.equal(GAME_MANIFEST_MAP["memory-test"]?.title, "순서 기억력 테스트");
});

test("Manifest score validation enforces score bounds correctly", () => {
  assert.equal(validateScoreByManifest("reaction-time", 200).valid, true);
  assert.equal(validateScoreByManifest("reaction-time", 10).valid, false);
  assert.equal(validateScoreByManifest("memory-test", 15).valid, true);
  // min is 0, not 1 — a player who fails on their very first color legitimately completes 0
  // levels (see MemoryGameUI.tsx's handleColorClick), so this must be a VALID score, not rejected.
  assert.equal(validateScoreByManifest("memory-test", 0).valid, true);
  assert.equal(validateScoreByManifest("memory-test", -1).valid, false);
  assert.equal(validateScoreByManifest("memory-test", 99).valid, false);
});
