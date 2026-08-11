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
});
