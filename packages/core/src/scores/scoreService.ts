import type { LeaderRecord } from "@gamemoa/shared";

/**
 * Filter leaderboard records by game ID (pure domain logic)
 */
export function filterLeaderboard(records: LeaderRecord[], gameId?: string): LeaderRecord[] {
  if (!gameId || gameId === "all") return records;
  return records.filter((r) => r.gameId === gameId);
}
