import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_ROUND_STATE,
  startRound,
  showGreen,
  handleClick,
  isValidReactionTime,
  calculateAverageReactionTime,
  generateDelay,
  MIN_DELAY_MS,
  MAX_DELAY_MS,
} from "../src/rules.js";

describe("reaction-time rules", () => {
  describe("startRound", () => {
    it("should transition from waiting to ready", () => {
      const state = startRound(1000);
      assert.equal(state.phase, "ready");
      assert.equal(state.startedAt, 1000);
    });
  });

  describe("showGreen", () => {
    it("should transition from ready to go", () => {
      const ready = startRound(1000);
      const go = showGreen(ready, 2000);
      assert.equal(go.phase, "go");
      assert.equal(go.greenAt, 2000);
    });

    it("should not transition from non-ready states", () => {
      const state = showGreen(INITIAL_ROUND_STATE, 2000);
      assert.equal(state.phase, "waiting");
    });
  });

  describe("handleClick", () => {
    it("should return too-early when clicking during ready", () => {
      const ready = startRound(1000);
      const result = handleClick(ready, 1500);
      assert.equal(result.phase, "too-early");
    });

    it("should calculate reaction time when clicking during go", () => {
      const ready = startRound(1000);
      const go = showGreen(ready, 2000);
      const result = handleClick(go, 2250);
      assert.equal(result.phase, "result");
      assert.equal(result.reactionTimeMs, 250);
    });

    it("should not change state when clicking during waiting", () => {
      const result = handleClick(INITIAL_ROUND_STATE, 1000);
      assert.equal(result.phase, "waiting");
    });
  });

  describe("isValidReactionTime", () => {
    it("should accept reasonable times", () => {
      assert.equal(isValidReactionTime(200), true);
      assert.equal(isValidReactionTime(500), true);
    });

    it("should reject invalid times", () => {
      assert.equal(isValidReactionTime(0), false);
      assert.equal(isValidReactionTime(-1), false);
      assert.equal(isValidReactionTime(10001), false);
    });
  });

  describe("calculateAverageReactionTime", () => {
    it("should calculate correct average", () => {
      assert.equal(calculateAverageReactionTime([200, 300, 400]), 300);
    });

    it("should return 0 for empty array", () => {
      assert.equal(calculateAverageReactionTime([]), 0);
    });
  });

  describe("generateDelay", () => {
    it("should return a value within bounds", () => {
      for (let i = 0; i < 100; i++) {
        const delay = generateDelay();
        assert.ok(delay >= MIN_DELAY_MS);
        assert.ok(delay <= MAX_DELAY_MS);
      }
    });
  });
});
