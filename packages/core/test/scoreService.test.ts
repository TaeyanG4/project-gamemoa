import test from "node:test";
import assert from "node:assert/strict";
import { filterLeaderboard, MOCK_LEADERBOARD } from "../src/scores/scoreService.js";

test("filterLeaderboard returns all records when gameId is 'all' or undefined", () => {
  assert.equal(filterLeaderboard(MOCK_LEADERBOARD, "all").length, MOCK_LEADERBOARD.length);
  assert.equal(filterLeaderboard(MOCK_LEADERBOARD, undefined).length, MOCK_LEADERBOARD.length);
});

test("filterLeaderboard filters by specific gameId", () => {
  const reactionRecords = filterLeaderboard(MOCK_LEADERBOARD, "reaction-time");
  assert.equal(reactionRecords.length, 3);
  assert(reactionRecords.every((r) => r.gameId === "reaction-time"));
});
