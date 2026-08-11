import type { LeaderRecord, ScoreSubmission } from "@gamemoa/shared";

export const MOCK_LEADERBOARD: LeaderRecord[] = [
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
    playerName: "ReflexMaster",
    gameId: "reaction-time",
    gameTitle: "반응속도 테스트",
    score: 212,
    formattedScore: "212 ms",
    grade: "A",
    createdAt: "2026-08-10",
  },
  {
    id: "rec-4",
    playerName: "MemoryKing",
    gameId: "memory-test",
    gameTitle: "순서 기억력 테스트",
    score: 14,
    formattedScore: "Level 14",
    grade: "S",
    createdAt: "2026-08-11",
  },
  {
    id: "rec-5",
    playerName: "BrainPower",
    gameId: "memory-test",
    gameTitle: "순서 기억력 테스트",
    score: 11,
    formattedScore: "Level 11",
    grade: "A",
    createdAt: "2026-08-09",
  },
];

export function getLocalBestScore(gameId: string): number | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const raw = localStorage.getItem(`gamemoa_best_${gameId}`);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

export function saveLocalBestScore(gameId: string, score: number, lowerIsBetter = true): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  const current = getLocalBestScore(gameId);
  const isBetter = current === null || (lowerIsBetter ? score < current : score > current);
  if (isBetter) {
    localStorage.setItem(`gamemoa_best_${gameId}`, String(score));
    return true;
  }
  return false;
}

export function filterLeaderboard(records: LeaderRecord[], gameId?: string): LeaderRecord[] {
  if (!gameId || gameId === "all") return records;
  return records.filter((r) => r.gameId === gameId);
}
