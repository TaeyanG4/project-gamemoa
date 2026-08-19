import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveGameRuntimeKind,
  buildGameResultFromBridgeComplete,
  shouldRemountIframeOnDifficultyChange,
} from "../features/game/GameHost";
import type { SystemGameRelease } from "../features/game/runtime/systemGameReleaseMap.generated";

/**
 * The pure decisions the SYSTEM-games iframe migration adds to GameHost: which runtime a slug
 * plays through, how a Game Bridge GAME_COMPLETE payload becomes the GameResult runtime.complete
 * already knows how to handle, and when a difficulty-selector change must force an iframe-runtime
 * game to remount (see aim-test's own difficulty tiers). Extracted the same way
 * formatMetadataKey/Value were (see gameHostMetadata.test.ts) — this suite has no DOM renderer, so
 * this is the part of the new runtime-selection logic that's actually testable without one.
 */

const RELEASES: Readonly<Record<string, SystemGameRelease>> = {
  "reaction-time": { version: "abc123", entry: "index.html" },
};

const ALL_FOUR_MIGRATED: Readonly<Record<string, SystemGameRelease>> = {
  "reaction-time": { version: "aaa", entry: "index.html" },
  "aim-test": { version: "bbb", entry: "index.html" },
  "memory-test": { version: "ccc", entry: "index.html" },
  "typing-test": { version: "ddd", entry: "index.html" },
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

test("resolveGameRuntimeKind: with all four SYSTEM games in the release map, all four resolve to iframe", () => {
  for (const slug of ["reaction-time", "aim-test", "memory-test", "typing-test"]) {
    assert.equal(resolveGameRuntimeKind(slug, ALL_FOUR_MIGRATED), "iframe", slug);
  }
});

// ── shouldRemountIframeOnDifficultyChange ────────────────────────────────────

test("shouldRemountIframeOnDifficultyChange: never fires for a legacy-runtime game, even with difficulty tiers", () => {
  assert.equal(
    shouldRemountIframeOnDifficultyChange("normal", "hard", {
      runtimeKind: "legacy",
      hasDifficultyTiers: true,
    }),
    false,
  );
});

test("shouldRemountIframeOnDifficultyChange: never fires for an iframe-runtime game with no difficulty tiers (memory-test, typing-test, reaction-time)", () => {
  assert.equal(
    shouldRemountIframeOnDifficultyChange("normal", "hard", {
      runtimeKind: "iframe",
      hasDifficultyTiers: false,
    }),
    false,
  );
});

test("shouldRemountIframeOnDifficultyChange: never fires on the very first render for a slug (no prior attempt tracked yet)", () => {
  assert.equal(
    shouldRemountIframeOnDifficultyChange(undefined, "normal", {
      runtimeKind: "iframe",
      hasDifficultyTiers: true,
    }),
    false,
  );
});

test("shouldRemountIframeOnDifficultyChange: does not fire when the difficulty is unchanged", () => {
  assert.equal(
    shouldRemountIframeOnDifficultyChange("normal", "normal", {
      runtimeKind: "iframe",
      hasDifficultyTiers: true,
    }),
    false,
  );
});

test("shouldRemountIframeOnDifficultyChange: fires when an iframe-runtime game with difficulty tiers actually changes tier (aim-test normal -> hard)", () => {
  assert.equal(
    shouldRemountIframeOnDifficultyChange("normal", "hard", {
      runtimeKind: "iframe",
      hasDifficultyTiers: true,
    }),
    true,
  );
  assert.equal(
    shouldRemountIframeOnDifficultyChange("hard", "normal", {
      runtimeKind: "iframe",
      hasDifficultyTiers: true,
    }),
    true,
  );
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
