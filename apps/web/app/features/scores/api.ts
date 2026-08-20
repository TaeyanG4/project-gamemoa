import {
  LeaderboardResponseSchema,
  PersonalBestResponseSchema,
  SubmitScoreResponseSchema,
  type LeaderRecord,
  type SubmitScoreResponse,
} from "@owogg/contracts";
import { apiFetch } from "../../lib/api";

let activePlayToken: string | null = null;

export function consumeActivePlayToken(): string | null {
  const token = activePlayToken;
  activePlayToken = null;
  return token;
}

export function setActivePlayToken(token: string | null): void {
  activePlayToken = token;
}

export function extractPlayTokenFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  if (!hash || !hash.includes("play_token=")) return null;

  try {
    const hashStr = hash.startsWith("#") ? hash.substring(1) : hash;
    const params = new URLSearchParams(hashStr);
    const token = params.get("play_token");
    if (token) {
      activePlayToken = token;
      params.delete("play_token");
      const newHash = params.toString() ? `#${params.toString()}` : "";
      const newUrl = window.location.pathname + window.location.search + newHash;
      window.history.replaceState(null, "", newUrl);
      return token;
    }
  } catch {
    // Ignore URL parse errors
  }
  return null;
}

export function getLocalBestScore(gameId: string): number | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const raw = localStorage.getItem(`owogg_best_${gameId}`);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

export function saveLocalBestScore(gameId: string, score: number, lowerIsBetter = true): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  const current = getLocalBestScore(gameId);
  const isBetter = current === null || (lowerIsBetter ? score < current : score > current);
  if (isBetter) {
    localStorage.setItem(`owogg_best_${gameId}`, String(score));
    return true;
  }
  return false;
}

export async function submitScoreApi(payload: {
  gameId: string;
  score: number;
  nickname?: string;
  /** Required compatibility token — POST /api/scores no longer accepts unsigned writes. */
  gameSessionToken: string;
  playToken?: string | null;
  /** Omitted = the game's default difficulty (or "normal" for games without difficulty tiers). */
  difficulty?: string;
}): Promise<SubmitScoreResponse> {
  const tokenToUse = payload.playToken || consumeActivePlayToken();
  return await apiFetch("/api/scores", SubmitScoreResponseSchema, {
    method: "POST",
    body: JSON.stringify({
      game_id: payload.gameId,
      score: payload.score,
      nickname: payload.nickname,
      gameSessionToken: payload.gameSessionToken,
      ...(tokenToUse ? { play_token: tokenToUse } : {}),
      ...(payload.difficulty ? { difficulty: payload.difficulty } : {}),
    }),
  });
}

export async function fetchLeaderboardApi(
  gameId = "all",
  difficulty?: string,
): Promise<LeaderRecord[]> {
  const query = difficulty ? `?difficulty=${encodeURIComponent(difficulty)}` : "";
  const data = await apiFetch(
    `/api/scores/${encodeURIComponent(gameId)}${query}`,
    LeaderboardResponseSchema,
  );
  const list = data.leaderboard || [];

  // gameTitle is resolved server-side now (apps/api/src/routes/scores.ts, off the same
  // GameRegistry the leaderboard query itself used) — no second request and no direct import of
  // core's generated registry needed here. Falls back to the raw gameId only for a response from
  // an old cached edge response predating this field, or a malformed one; not expected in
  // practice, since the schema always resolves an id.
  return list.map((item) => {
    const gId = item.gameId || gameId;
    return {
      ...item,
      gameId: gId,
      gameTitle: item.gameTitle ?? gId,
    };
  });
}

export async function fetchUserBestsApi(): Promise<Record<string, number>> {
  const data = await apiFetch("/api/scores/user/me", PersonalBestResponseSchema);
  return data.bests || {};
}
