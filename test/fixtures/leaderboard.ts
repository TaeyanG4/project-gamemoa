import type { LeaderRecord } from "@gamemoa/shared";

export const MOCK_LEADERBOARD_FIXTURE: LeaderRecord[] = [
  {
    id: "rec-1",
    playerName: "SpeedDemon",
    gameId: "reaction-time",
    gameTitle: "반응속도 테스트",
    score: 178,
    formattedScore: "178 ms",
    grade: "S",
    createdAt: "2026-08-11",
  },
  {
    id: "rec-2",
    playerName: "LightningFast",
    gameId: "reaction-time",
    gameTitle: "반응속도 테스트",
    score: 195,
    formattedScore: "195 ms",
    grade: "S",
    createdAt: "2026-08-11",
  },
  {
    id: "rec-3",
    playerName: "MemoryKing",
    gameId: "memory-test",
    gameTitle: "순서 기억력 테스트",
    score: 14,
    formattedScore: "Level 14",
    grade: "S",
    createdAt: "2026-08-11",
  },
];
