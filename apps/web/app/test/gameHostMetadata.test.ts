import test from "node:test";
import assert from "node:assert/strict";
import {
  formatMetadataKey,
  formatMetadataValue,
  METADATA_GRID_EXCLUDED_KEYS,
} from "../features/game/GameHost";
import { DICTIONARIES } from "../features/i18n/dictionary";

/**
 * GameHost's result-overlay metadata grid, extracted to pure functions that this suite can
 * exercise directly — the web test suite has no DOM renderer (plain `tsx --test`, no jsdom/
 * testing-library), so this is the part of that split that's actually testable in isolation.
 * The stateful lifecycle around it (loading, score submission, retry, leaderboard, share) is
 * unchanged by the GamePage/GameHost split and isn't covered by an automated test here for the
 * same tooling reason — see the PR description for what would be needed to close that gap.
 */

const gamePlayDict = DICTIONARIES["ko-KR"].gamePlay;

test("formatMetadataKey maps every known result-metadata key to its localized label", () => {
  const cases: Array<[string, string]> = [
    ["wpm", gamePlayDict.metadataWpm],
    ["cpm", gamePlayDict.metadataCpm],
    ["accuracy", gamePlayDict.metadataAccuracy],
    ["correctChars", gamePlayDict.metadataCorrectChars],
    ["incorrectChars", gamePlayDict.metadataIncorrectChars],
    ["totalTypedChars", gamePlayDict.metadataTotalTypedChars],
    ["durationMs", gamePlayDict.metadataDurationMs],
    ["targetsHit", gamePlayDict.metadataTargetsHit],
    ["misses", gamePlayDict.metadataMisses],
    ["level", gamePlayDict.metadataLevel],
    // aim-test's own runtime.complete metadata (games/aim-test/src/game.tsx).
    ["targets", gamePlayDict.metadataTargets],
    ["avgPerTargetMs", gamePlayDict.metadataAvgPerTargetMs],
    // memory-test's own runtime.complete metadata (games/memory-test/src/ui/MemoryGameUI.tsx).
    ["sequenceLength", gamePlayDict.metadataSequenceLength],
    ["grade", gamePlayDict.metadataGrade],
  ];
  for (const [key, expected] of cases) {
    assert.equal(formatMetadataKey(key, gamePlayDict), expected, key);
  }
});

test("formatMetadataKey falls back to the raw key for anything a game didn't declare", () => {
  assert.equal(
    formatMetadataKey("someFutureGameSpecificKey", gamePlayDict),
    "someFutureGameSpecificKey",
  );
});

test("formatMetadataValue appends a percent sign only for accuracy, and only when numeric", () => {
  assert.equal(formatMetadataValue("accuracy", 97), "97%");
  // A non-numeric "accuracy" (shouldn't happen from real game code, but the guard exists) must
  // not silently render "undefined%" or similar.
  assert.equal(formatMetadataValue("accuracy", "n/a"), "n/a");
});

test("formatMetadataValue stringifies every other key as-is, without unit suffixes", () => {
  assert.equal(formatMetadataValue("wpm", 85), "85");
  assert.equal(formatMetadataValue("correctChars", 240), "240");
  assert.equal(formatMetadataValue("level", 12), "12");
});

test("the excluded-keys set is exactly tier/rounds/mode/difficultyId — each has its own dedicated presentation elsewhere in the result card", () => {
  // A regression here (an accidentally-added or -removed key) would either hide a metric that
  // should show in the generic grid, or leak an internal value (e.g. the raw per-round ms array,
  // or aim-test's own internal difficulty id) into it.
  assert.deepEqual([...METADATA_GRID_EXCLUDED_KEYS].sort(), [
    "difficultyId",
    "mode",
    "rounds",
    "tier",
  ]);
});

test("every metadata key the four SYSTEM games actually emit is either mapped or excluded — never a raw key leaking into the grid", () => {
  // One assertion per real runtime.complete() metadata shape, sourced directly from each game's
  // own source file (not re-derived here) — this is the regression test for "a game's metadata
  // key shows up as its own unlocalized property name in the result card" across all four
  // migrated SYSTEM games at once, rather than one game at a time.
  const emittedKeys: Record<string, string[]> = {
    "reaction-time": ["rounds", "tier"], // games/reaction-time/src/game.tsx
    "aim-test": ["targets", "avgPerTargetMs", "difficultyId"], // games/aim-test/src/game.tsx
    "memory-test": ["level", "sequenceLength", "grade"], // games/memory-test/src/ui/MemoryGameUI.tsx
    "typing-test": [
      "wpm",
      "cpm",
      "accuracy",
      "correctChars",
      "incorrectChars",
      "totalTypedChars",
      "durationMs",
      "mode",
    ], // games/typing-test/src/game.tsx
  };

  for (const [slug, keys] of Object.entries(emittedKeys)) {
    for (const key of keys) {
      const isExcluded = METADATA_GRID_EXCLUDED_KEYS.has(key);
      const isMapped = formatMetadataKey(key, gamePlayDict) !== key;
      assert.ok(
        isExcluded || isMapped,
        `${slug}'s "${key}" metadata key is neither mapped nor excluded`,
      );
    }
  }
});
