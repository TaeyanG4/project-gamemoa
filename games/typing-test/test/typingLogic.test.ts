import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateWpm,
  calculateCpm,
  calculateAccuracy,
  calculateTypingResult,
  computeSegmentStats,
  getRandomPassage,
} from "../src/logic.js";

test("calculateWpm returns 0 for 0 duration or 0 correct characters", () => {
  assert.equal(calculateWpm(0, 60000), 0);
  assert.equal(calculateWpm(50, 0), 0);
  assert.equal(calculateWpm(0, 0), 0);
});

test("calculateWpm calculates WPM correctly and rounds to integer", () => {
  // 250 correct characters in 60 seconds (60000ms) -> 250 / 5 = 50 WPM
  assert.equal(calculateWpm(250, 60000), 50);

  // 150 correct characters in 30 seconds (30000ms) -> (150 / 5) / 0.5 = 60 WPM
  assert.equal(calculateWpm(150, 30000), 60);
});

test("calculateCpm calculates CPM correctly", () => {
  // 300 total characters in 60 seconds -> 300 CPM
  assert.equal(calculateCpm(300, 60000), 300);
});

test("calculateAccuracy calculates percentage accurately", () => {
  assert.equal(calculateAccuracy(100, 100), 100);
  assert.equal(calculateAccuracy(90, 100), 90);
  assert.equal(calculateAccuracy(0, 100), 0);
  assert.equal(calculateAccuracy(0, 0), 100);
});

test("computeSegmentStats detects correct and incorrect characters", () => {
  const target = "hello world";
  const typed = "hello wordd"; // 11 chars: 10 correct ('h','e','l','l','o',' ','w','o','r','d'), 1 incorrect ('d' vs 'l')
  const stats = computeSegmentStats(target, typed);
  assert.equal(stats.totalTypedChars, 11);
  assert.equal(stats.correctChars, 10);
  assert.equal(stats.incorrectChars, 1);
});

test("calculateTypingResult calculates full result object with cumulative stats", () => {
  const result = calculateTypingResult(10, 1, 11, 60000);
  assert.equal(result.totalTypedChars, 11);
  assert.equal(result.correctChars, 10);
  assert.equal(result.incorrectChars, 1);
  assert.equal(result.accuracy, 91); // 10/11 = 90.9% -> 91%
  assert.equal(result.scoreWpm, 2); // 10/5 = 2 words in 1 min -> 2 WPM
});

test("getRandomPassage returns deterministic passage by index", () => {
  const p0 = getRandomPassage(0);
  assert.ok(p0.startsWith("The quick brown fox"));
});

test("whitespace in target passages contains standard spaces for word boundary separation", () => {
  const p0 = getRandomPassage(0);
  const words = p0.split(" ");
  assert.ok(words.length > 5, "Passage should be split into multiple readable words");
  assert.equal(words[0], "The");
  assert.equal(words[1], "quick");
  assert.equal(words[2], "brown");
  assert.equal(words[3], "fox");
});

test("computeSegmentStats after Backspace correction computes clean stats for corrected input", () => {
  const target = "The quick brown fox";
  // User typed wrong char 'x' then pressed Backspace and typed correct 'e'
  const typedBefore = "Thx";
  const statsBefore = computeSegmentStats(target, typedBefore);
  assert.equal(statsBefore.incorrectChars, 1);

  // After Backspace and typing 'e'
  const typedAfter = "The";
  const statsAfter = computeSegmentStats(target, typedAfter);
  assert.equal(statsAfter.incorrectChars, 0);
  assert.equal(statsAfter.correctChars, 3);
});
