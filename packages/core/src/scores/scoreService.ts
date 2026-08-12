import type { LeaderRecord } from "@gamemoa/shared";

const API_URL = typeof window !== "undefined"
  ? ((import.meta as any).env?.VITE_API_URL ?? "http://localhost:8787")
  : "http://localhost:8787";

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

/**
 * Submit score to Hono API backend
 */
export async function submitScoreApi(payload: {
  gameId: string;
  score: number;
  nickname?: string;
}): Promise<{ success: boolean; score_id?: number }> {
  try {
    const res = await fetch(`${API_URL}/api/scores`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game_id: payload.gameId,
        score: payload.score,
        nickname: payload.nickname,
      }),
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch {
    return { success: false };
  }
}

/**
 * Fetch leaderboard from Hono API backend
 */
export async function fetchLeaderboardApi(gameId = "all"): Promise<LeaderRecord[]> {
  try {
    const res = await fetch(`${API_URL}/api/scores/${encodeURIComponent(gameId)}`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data.leaderboard || [];

    const titleMap: Record<string, string> = {
      "reaction-time": "반응속도 테스트",
      "memory-test": "순서 기억력 테스트",
      "aim-test": "에임 테스트",
    };

    return list.map((item: any) => ({
      id: String(item.id),
      playerName: item.playerName || item.nickname || "게스트",
      gameId: item.gameId || gameId,
      gameTitle: titleMap[item.gameId] || item.gameId,
      score: item.score,
      formattedScore: item.formattedScore || `${item.score}`,
      avatarUrl: item.avatarUrl || item.avatar_url,
      createdAt: item.createdAt || item.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch user's personal bests from Hono API backend
 */
export async function fetchUserBestsApi(): Promise<Record<string, number>> {
  try {
    const res = await fetch(`${API_URL}/api/scores/user/me`, {
      credentials: "include",
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.bests || {};
  } catch {
    return {};
  }
}
