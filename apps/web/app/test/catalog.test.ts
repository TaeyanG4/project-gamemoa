import test from "node:test";
import assert from "node:assert/strict";
import { GAME_MANIFESTS, GAME_MANIFEST_MAP, validateScoreByManifest } from "@gamemoa/core";

test("Game Catalog manifests contain published games", () => {
  assert.ok(GAME_MANIFESTS.length >= 2);
  assert.equal(GAME_MANIFEST_MAP["reaction-time"]?.title, "반응속도 테스트");
  assert.equal(GAME_MANIFEST_MAP["memory-test"]?.title, "순서 기억력 테스트");
});

test("Manifest score validation enforces score bounds correctly", () => {
  assert.equal(validateScoreByManifest("reaction-time", 200).valid, true);
  assert.equal(validateScoreByManifest("reaction-time", 10).valid, false);
  assert.equal(validateScoreByManifest("memory-test", 15).valid, true);
  assert.equal(validateScoreByManifest("memory-test", 0).valid, false);
  assert.equal(validateScoreByManifest("memory-test", 99).valid, false);
});
