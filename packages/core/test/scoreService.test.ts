import test from "node:test";
import assert from "node:assert/strict";
import { filterLeaderboard } from "../src/scores/scoreService.js";
import type { LeaderRecord } from "@gamemoa/shared";

const dummyRecords: LeaderRecord[] = [
  {
    id: "1",
    playerName: "Alice",
    gameId: "reaction-time",
    gameTitle: "반응속도 테스트",
    score: 200,
    formattedScore: "200 ms",
    createdAt: "2026-08-12",
  },
  {
    id: "2",
    playerName: "Bob",
    gameId: "memory-test",
    gameTitle: "순서 기억력 테스트",
    score: 10,
    formattedScore: "Level 10",
    createdAt: "2026-08-12",
  },
];

test("filterLeaderboard returns all records when gameId is 'all' or undefined", () => {
  assert.equal(filterLeaderboard(dummyRecords, "all").length, dummyRecords.length);
  assert.equal(filterLeaderboard(dummyRecords, undefined).length, dummyRecords.length);
});

test("filterLeaderboard filters by specific gameId", () => {
  const reactionRecords = filterLeaderboard(dummyRecords, "reaction-time");
  assert.equal(reactionRecords.length, 1);
  assert.equal(reactionRecords[0]?.gameId, "reaction-time");
});
