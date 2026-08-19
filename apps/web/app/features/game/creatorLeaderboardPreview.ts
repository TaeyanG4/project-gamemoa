import { fetchLeaderboardApi } from "../scores/api";
import type { LeaderRecord } from "@owogg/contracts";

const PREVIEW_SIZE = 5;

/**
 * Fetches a Creator game's leaderboard preview for CreatorGameHost's result screen — the exact
 * same GET /api/scores/:slug leaderboard read SYSTEM games already use (generalized to Creator
 * games in feat/creator-leaderboard-read; no new endpoint, no new ranking logic here), sliced to
 * the top PREVIEW_SIZE entries the same way GameHost's own preview already does (see that
 * component's leaderboard-preview effect). Ordering (asc/desc) is whatever the API already
 * returned — this never re-sorts, it only takes the front of the list.
 *
 * Never throws — a failed fetch must never take down the result screen CreatorGameHost already
 * rendered (score save success/failure is reported independently by creatorScoreFlow.ts). A
 * failure resolves to an empty array, the same non-fatal "shows as empty" posture GameHost's own
 * preview fetch already uses for its own failures.
 *
 * `fetchLeaderboard` is injectable (defaults to the real fetchLeaderboardApi) purely so this can
 * be unit tested without a network call — apps/web has no DOM/component render harness, so this
 * function is deliberately kept framework-free and callable directly from CreatorGameHost's own
 * effect, matching this codebase's established pattern (creatorScoreFlow.ts, gameBridgeHost.ts).
 */
export async function fetchCreatorLeaderboardPreview(
  slug: string,
  fetchLeaderboard: (slug: string) => Promise<LeaderRecord[]> = fetchLeaderboardApi,
): Promise<LeaderRecord[]> {
  try {
    const records = await fetchLeaderboard(slug);
    return records.slice(0, PREVIEW_SIZE);
  } catch {
    return [];
  }
}
