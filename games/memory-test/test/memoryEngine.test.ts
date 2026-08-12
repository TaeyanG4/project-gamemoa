import test from "node:test";
import assert from "node:assert/strict";
import { generateNextColor, evaluateGrade, MEMORY_COLORS } from "../src/engine/memoryEngine.js";

test("generateNextColor returns one of valid colors", () => {
  for (let i = 0; i < 20; i++) {
    const color = generateNextColor();
    assert(MEMORY_COLORS.includes(color));
  }
});

test("evaluateGrade assigns correct grades based on level", () => {
  assert.equal(evaluateGrade(15), "S");
  assert.equal(evaluateGrade(12), "S");
  assert.equal(evaluateGrade(10), "A");
  assert.equal(evaluateGrade(7), "B");
  assert.equal(evaluateGrade(4), "C");
  assert.equal(evaluateGrade(1), "F");
  assert.equal(evaluateGrade(0), "F");
});

test("Memory score calculation: completed sequence levels = level - 1", () => {
  const getCompletedLevels = (currentLevel: number) => Math.max(0, currentLevel - 1);
  assert.equal(getCompletedLevels(1), 0); // Failed on level 1 sequence
  assert.equal(getCompletedLevels(5), 4); // Completed 4 levels, failed on 5
  assert.equal(getCompletedLevels(10), 9); // Completed 9 levels, failed on 10
});
