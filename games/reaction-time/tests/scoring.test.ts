import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { reactionTimeScoring } from "../src/scoring.js";

describe("reaction-time scoring", () => {
  it("should be lower-is-better", () => {
    assert.equal(reactionTimeScoring.order, "lower-is-better");
  });

  it("should normalize by negating", () => {
    assert.equal(reactionTimeScoring.normalize(200), -200);
    assert.equal(reactionTimeScoring.normalize(500), -500);
  });

  it("should format with ms suffix", () => {
    assert.equal(reactionTimeScoring.format(234), "234ms");
    assert.equal(reactionTimeScoring.format(234.7), "235ms");
  });
});
