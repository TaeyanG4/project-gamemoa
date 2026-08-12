import {
  ProgressResponseSchema,
  AchievementSummaryResponseSchema,
  type ProgressResponse,
  type AchievementSummaryResponse,
} from "@gamemoa/contracts";
import { apiFetch } from "../../lib/api";

export async function fetchMyProgressApi(): Promise<ProgressResponse> {
  return await apiFetch("/api/progression/me", ProgressResponseSchema);
}

export async function fetchMyAchievementsApi(): Promise<AchievementSummaryResponse> {
  return await apiFetch("/api/progression/achievements", AchievementSummaryResponseSchema);
}
