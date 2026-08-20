import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveOfficialRuntimeUrl,
  buildGameResultFromBridgeComplete,
  shouldRemountIframeOnDifficultyChange,
} from "../features/game/GameHost";
import { API_URL } from "../lib/api/config";

/**
 * The pure decisions around GameHost's generic official iframe runtime: which provider-neutral
 * URL a slug uses, how a Game Bridge GAME_COMPLETE payload becomes the GameResult runtime.complete
 * already knows how to handle, and when a difficulty-selector change must force the iframe game
 * to remount (see aim-test's own difficulty tiers). Extracted the same way
 * formatMetadataKey/Value were (see gameHostMetadata.test.ts) — this suite has no DOM renderer, so
 * this is the part of the new runtime-selection logic that's actually testable without one.
 */

test("official primary runtime URLs use the generic /play resolver, independent of the release map", () => {
  for (const slug of ["reaction-time", "aim-test", "memory-test", "typing-test"]) {
    assert.equal(resolveOfficialRuntimeUrl(slug), `${API_URL}/play/${slug}`, slug);
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
