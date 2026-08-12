import {
  LeaderboardResponseSchema,
  PersonalBestResponseSchema,
  SubmitScoreResponseSchema,
  type LeaderRecord,
  type SubmitScoreResponse,
} from "@gamemoa/contracts";
import { GAME_MANIFEST_MAP } from "@gamemoa/core";
import { apiFetch } from "../../lib/api";

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

export async function submitScoreApi(payload: {
  gameId: string;
  score: number;
  nickname?: string;
}): Promise<SubmitScoreResponse> {
  return await apiFetch("/api/scores", SubmitScoreResponseSchema, {
    method: "POST",
    body: JSON.stringify({
      game_id: payload.gameId,
      score: payload.score,
      nickname: payload.nickname,
    }),
  });
}

export async function fetchLeaderboardApi(gameId = "all"): Promise<LeaderRecord[]> {
  const data = await apiFetch(
    `/api/scores/${encodeURIComponent(gameId)}`,
    LeaderboardResponseSchema,
  );
  const list = data.leaderboard || [];

  return list.map((item) => {
    const gId = item.gameId || gameId;
    const manifest = GAME_MANIFEST_MAP[gId];
    const title = manifest?.title ?? gId;

    return {
      ...item,
      gameId: gId,
      gameTitle: title,
    };
  });
}

export async function fetchUserBestsApi(): Promise<Record<string, number>> {
  const data = await apiFetch("/api/scores/user/me", PersonalBestResponseSchema);
  return data.bests || {};
}
