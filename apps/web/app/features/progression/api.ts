import {
  ProgressResponseSchema,
  AchievementSummaryResponseSchema,
  XpLeaderboardResponseSchema,
  type ProgressResponse,
  type AchievementSummaryResponse,
  type XpLeaderboardResponse,
} from "@gamemoa/contracts";
import { apiFetch } from "../../lib/api";

export async function fetchMyProgressApi(): Promise<ProgressResponse> {
  return await apiFetch("/api/progression/me", ProgressResponseSchema);
}

export async function fetchMyAchievementsApi(): Promise<AchievementSummaryResponse> {
  return await apiFetch("/api/progression/achievements", AchievementSummaryResponseSchema);
}

export async function fetchXpLeaderboardApi(limit = 20): Promise<XpLeaderboardResponse> {
  return await apiFetch(`/api/progression/leaderboard?limit=${limit}`, XpLeaderboardResponseSchema);
}
