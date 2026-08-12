import test from "node:test";
import assert from "node:assert/strict";
import {
  levelForTotalXp,
  xpRequiredForLevel,
  getProgressionSummary,
  XP_PER_ACCEPTED_COMPLETION,
  XP_DAILY_CAP_COMPLETIONS_PER_GAME,
} from "../src/domain/progression.js";

test("xpRequiredForLevel matches the documented cumulative curve", () => {
  assert.equal(xpRequiredForLevel(1), 0);
  assert.equal(xpRequiredForLevel(2), 100);
  assert.equal(xpRequiredForLevel(3), 400);
  assert.equal(xpRequiredForLevel(4), 900);
  assert.equal(xpRequiredForLevel(5), 1600);
});

test("levelForTotalXp exact thresholds", () => {
  assert.equal(levelForTotalXp(0), 1);
  assert.equal(levelForTotalXp(100), 2);
  assert.equal(levelForTotalXp(400), 3);
  assert.equal(levelForTotalXp(900), 4);
  assert.equal(levelForTotalXp(1600), 5);
});

test("levelForTotalXp boundary just below a threshold stays at the lower level", () => {
  assert.equal(levelForTotalXp(99), 1);
  assert.equal(levelForTotalXp(399), 2);
  assert.equal(levelForTotalXp(899), 3);
  assert.equal(levelForTotalXp(1599), 4);
});

test("levelForTotalXp boundary just above a threshold advances to the higher level", () => {
  assert.equal(levelForTotalXp(101), 2);
  assert.equal(levelForTotalXp(401), 3);
});

test("levelForTotalXp clamps negative XP to level 1", () => {
  assert.equal(levelForTotalXp(-50), 1);
});

test("levelForTotalXp stays exact at large perfect-square XP values (no float drift)", () => {
  // Level 101 requires 100 * 100^2 = 1,000,000 XP.
  assert.equal(levelForTotalXp(1_000_000), 101);
  assert.equal(levelForTotalXp(999_999), 100);
});

test("getProgressionSummary reports consistent derived fields mid-level", () => {
  // Level 2 spans [100, 400). 250 XP is the midpoint.
  const summary = getProgressionSummary(250);
  assert.equal(summary.level, 2);
  assert.equal(summary.totalXp, 250);
  assert.equal(summary.currentLevelStartXp, 100);
  assert.equal(summary.nextLevelXp, 400);
  assert.equal(summary.currentLevelSpanXp, 300);
  assert.equal(summary.currentLevelProgressXp, 150);
  assert.equal(summary.progressPercent, 50);
});

test("getProgressionSummary at exactly a level threshold shows 0% progress into that level", () => {
  const summary = getProgressionSummary(1600);
  assert.equal(summary.level, 5);
  assert.equal(summary.currentLevelProgressXp, 0);
  assert.equal(summary.progressPercent, 0);
});

test("v1 policy constants match the documented anti-farming design", () => {
  assert.equal(XP_PER_ACCEPTED_COMPLETION, 10);
  assert.equal(XP_DAILY_CAP_COMPLETIONS_PER_GAME, 10);
});
