import test from "node:test";
import assert from "node:assert/strict";
import {
  validateScoreAgainstPolicy,
  validateDifficultyAgainstDefinition,
} from "../src/domain/scoreValidation.js";
import type { GameDifficulty, GamePolicy } from "../src/modules/game/domain/gameDefinition.js";

/**
 * Pure unit tests — no registry, no generated file, just policy objects in and a verdict out.
 * Equivalence with the real four official games (their actual score bounds and difficulty tiers,
 * exercised end-to-end through ScoreUseCases) lives in scoreUseCases.test.ts, which runs these
 * same rules through the real, generated GAME_DEFINITIONS.
 */

const REACTION_TIME_POLICY: GamePolicy = {
  score: { unit: "ms", direction: "asc", min: 50, max: 10000 },
  leaderboard: true,
  xpPerCompletion: 0,
  requiresAuth: false,
};

const UNSCORED_POLICY: GamePolicy = {
  score: null,
  leaderboard: false,
  xpPerCompletion: 0,
  requiresAuth: false,
};

test("validateScoreAgainstPolicy accepts a score within the policy's bounds", () => {
  assert.equal(validateScoreAgainstPolicy(REACTION_TIME_POLICY, 200).valid, true);
});

test("validateScoreAgainstPolicy rejects a score outside the policy's bounds", () => {
  assert.equal(validateScoreAgainstPolicy(REACTION_TIME_POLICY, 10).valid, false); // below min
  assert.equal(validateScoreAgainstPolicy(REACTION_TIME_POLICY, 15000).valid, false); // above max
});

test("validateScoreAgainstPolicy rejects negative scores, NaN, and +/-Infinity regardless of policy", () => {
  assert.equal(validateScoreAgainstPolicy(REACTION_TIME_POLICY, -5).valid, false);
  assert.equal(validateScoreAgainstPolicy(REACTION_TIME_POLICY, NaN).valid, false);
  assert.equal(validateScoreAgainstPolicy(REACTION_TIME_POLICY, Infinity).valid, false);
  assert.equal(validateScoreAgainstPolicy(REACTION_TIME_POLICY, -Infinity).valid, false);
});

test("validateScoreAgainstPolicy accepts a decimal score within bounds — score is a finite number, not integer-only", () => {
  // Pins the fix this test file's own name change documents: some games genuinely measure
  // fractional units (survival time in seconds, e.g. ball-dodge's 4.4), and the wire contracts
  // (scoreSubmissionSchema/CreatorScoreAcceptRequestSchema) never required an integer either.
  assert.equal(validateScoreAgainstPolicy(REACTION_TIME_POLICY, 123.45).valid, true);
});

test("validateScoreAgainstPolicy still enforces bounds on a decimal score exactly the same as an integer one", () => {
  assert.equal(validateScoreAgainstPolicy(REACTION_TIME_POLICY, 49.99).valid, false); // just below min (50)
  assert.equal(validateScoreAgainstPolicy(REACTION_TIME_POLICY, 10000.01).valid, false); // just above max
});

test("validateScoreAgainstPolicy rejects null policy — an unknown game, not a loose fallback (2026-08-17 beta hardening)", () => {
  // Preserved from before this refactor: an unrecognized/sandbox game id must not fall back to a
  // loose "0..1,000,000" bound. `null` is what a GameRegistry.findBySlug miss maps to.
  for (const score of [0, 1, 500, 999999, 1000000]) {
    assert.equal(
      validateScoreAgainstPolicy(null, score).valid,
      false,
      `score ${score} against no policy must be rejected`,
    );
  }
});

test("validateScoreAgainstPolicy accepts anything non-negative when the game is deliberately unscored", () => {
  // Distinct from `null`: this game exists, and has explicitly opted out of score bounds.
  assert.equal(validateScoreAgainstPolicy(UNSCORED_POLICY, 0).valid, true);
  assert.equal(validateScoreAgainstPolicy(UNSCORED_POLICY, 999999999).valid, true);
  assert.equal(validateScoreAgainstPolicy(UNSCORED_POLICY, 42.195).valid, true);
});

// ── difficulty ───────────────────────────────────────────────────────────────

const AIM_TEST_DIFFICULTY: GameDifficulty = {
  levels: [
    { id: "normal", label: "보통" },
    { id: "hard", label: "어려움" },
  ],
  defaultLevelId: "normal",
};

test("a game with no difficulty config only ever accepts normal (or nothing, defaulting to normal)", () => {
  assert.deepEqual(validateDifficultyAgainstDefinition(undefined, undefined), {
    valid: true,
    normalizedDifficultyId: "normal",
  });
  assert.deepEqual(validateDifficultyAgainstDefinition(undefined, "normal"), {
    valid: true,
    normalizedDifficultyId: "normal",
  });
  assert.equal(validateDifficultyAgainstDefinition(undefined, "hard").valid, false);
});

test("an omitted difficulty resolves to the game's own declared default", () => {
  const result = validateDifficultyAgainstDefinition(AIM_TEST_DIFFICULTY, undefined);
  assert.equal(result.valid, true);
  assert.equal(result.normalizedDifficultyId, "normal");
});

test("a declared tier is accepted; an unknown one is rejected and falls back to the default", () => {
  assert.deepEqual(validateDifficultyAgainstDefinition(AIM_TEST_DIFFICULTY, "hard"), {
    valid: true,
    normalizedDifficultyId: "hard",
  });

  const rejected = validateDifficultyAgainstDefinition(AIM_TEST_DIFFICULTY, "nightmare");
  assert.equal(rejected.valid, false);
  assert.equal(rejected.normalizedDifficultyId, "normal");
});

test("whitespace around a submitted difficulty id is trimmed before matching", () => {
  const result = validateDifficultyAgainstDefinition(AIM_TEST_DIFFICULTY, "  hard  ");
  assert.equal(result.valid, true);
  assert.equal(result.normalizedDifficultyId, "hard");
});
