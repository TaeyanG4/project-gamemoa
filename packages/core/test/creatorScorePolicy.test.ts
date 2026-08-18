import test from "node:test";
import assert from "node:assert/strict";
import { sandboxGameToScorePolicy } from "../src/domain/creatorScorePolicy.js";

test("a fully-configured score policy maps to a real GamePolicy with matching ScoreConfig", () => {
  const policy = sandboxGameToScorePolicy({
    scoreUnit: "points",
    scoreDirection: "desc",
    scoreMin: 0,
    scoreMax: 9999,
    scoreDisplayPrefix: null,
    scoreDisplaySuffix: " pts",
  });

  assert.deepEqual(policy, {
    score: { unit: "points", direction: "desc", min: 0, max: 9999, displaySuffix: " pts" },
    leaderboard: false,
    xpPerCompletion: 0,
    requiresAuth: true,
  });
});

test("returns null — not a GamePolicy with score: null — when any score field is unconfigured", () => {
  const complete = {
    scoreUnit: "points",
    scoreDirection: "desc" as const,
    scoreMin: 0,
    scoreMax: 9999,
  };

  assert.equal(sandboxGameToScorePolicy({ ...complete, scoreUnit: null }), null);
  assert.equal(sandboxGameToScorePolicy({ ...complete, scoreDirection: null }), null);
  assert.equal(sandboxGameToScorePolicy({ ...complete, scoreMin: null }), null);
  assert.equal(sandboxGameToScorePolicy({ ...complete, scoreMax: null }), null);
});

test("a freshly-registered game (every score field null) is null, not an unbounded policy", () => {
  const policy = sandboxGameToScorePolicy({
    scoreUnit: null,
    scoreDirection: null,
    scoreMin: null,
    scoreMax: null,
  });
  assert.equal(policy, null);
});

test("scoreMin: 0 is a valid, present bound — not confused with 'unconfigured'", () => {
  // 0 is falsy in JS; a naive `!game.scoreMin` check would wrongly treat a real zero-min bound as
  // missing. This pins the fix: only strict `=== null` counts as unconfigured.
  const policy = sandboxGameToScorePolicy({
    scoreUnit: "points",
    scoreDirection: "asc",
    scoreMin: 0,
    scoreMax: 100,
  });
  assert.ok(policy);
  assert.equal(policy.score?.min, 0);
});

test("displayPrefix/displaySuffix are omitted entirely when absent, not set to null/undefined", () => {
  const policy = sandboxGameToScorePolicy({
    scoreUnit: "points",
    scoreDirection: "desc",
    scoreMin: 0,
    scoreMax: 100,
  });
  assert.ok(policy?.score);
  assert.ok(!("displayPrefix" in policy.score));
  assert.ok(!("displaySuffix" in policy.score));
});
