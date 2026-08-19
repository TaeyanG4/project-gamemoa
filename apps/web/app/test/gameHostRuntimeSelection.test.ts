import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveGameRuntimeKind,
  buildGameResultFromBridgeComplete,
} from "../features/game/GameHost";
import type { SystemGameRelease } from "../features/game/runtime/systemGameReleaseMap.generated";

/**
 * The two pure decisions feat/reaction-time-iframe-migration adds to GameHost: which runtime a
 * slug plays through, and how a Game Bridge GAME_COMPLETE payload becomes the GameResult
 * runtime.complete already knows how to handle. Extracted the same way formatMetadataKey/Value
 * were (see gameHostMetadata.test.ts) — this suite has no DOM renderer, so this is the part of the
 * new runtime-selection logic that's actually testable without one.
 */

const RELEASES: Readonly<Record<string, SystemGameRelease>> = {
  "reaction-time": { version: "abc123", entry: "index.html" },
};

test("resolveGameRuntimeKind: a slug present in the release map plays through the iframe", () => {
  assert.equal(resolveGameRuntimeKind("reaction-time", RELEASES), "iframe");
});

test("resolveGameRuntimeKind: every other SYSTEM game stays on LegacyReactRuntime", () => {
  for (const slug of ["aim-test", "memory-test", "typing-test"]) {
    assert.equal(resolveGameRuntimeKind(slug, RELEASES), "legacy");
  }
});

test("resolveGameRuntimeKind: an empty release map (local dev, or a failed publish) falls back to legacy for every slug — never a broken iframe URL", () => {
  assert.equal(resolveGameRuntimeKind("reaction-time", {}), "legacy");
});

test("buildGameResultFromBridgeComplete: forwards score and metadata unchanged, preserving reaction-time's rounds+tier semantics", () => {
  const rounds = [210, 198, 205, 190, 187];
  const result = buildGameResultFromBridgeComplete(
    { score: 198, metadata: { rounds, tier: "lightning" } },
    { slug: "reaction-time", sessionId: "session-1" },
  );
  assert.ok(result);
  assert.equal(result.gameId, "reaction-time");
  assert.equal(result.sessionId, "session-1");
  assert.equal(result.score, 198);
  assert.deepEqual(result.metadata, { rounds, tier: "lightning" });
});

test("buildGameResultFromBridgeComplete: a completion with no score is not forwarded (nothing for score submission/local-best to do)", () => {
  assert.equal(buildGameResultFromBridgeComplete({}, { slug: "x", sessionId: "y" }), null);
});

test("buildGameResultFromBridgeComplete: metadata is omitted entirely (not set to undefined) when the bridge sent none", () => {
  const result = buildGameResultFromBridgeComplete(
    { score: 42 },
    { slug: "reaction-time", sessionId: "session-2" },
  );
  assert.ok(result);
  assert.equal("metadata" in result, false);
});
