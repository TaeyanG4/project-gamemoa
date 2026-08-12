import { GAME_MANIFEST_MAP } from "@gamemoa/core";

export const LOCAL_STORAGE_KEY = "gamemoa.personalization.v1";

export interface PersistedPersonalizationState {
  version: number;
  favoriteGameIds: string[];
  recentPlays: { gameId: string; lastPlayedAt: string }[];
}

function isValidGame(gameId: string): boolean {
  if (!gameId || typeof gameId !== "string") return false;
  const manifest = GAME_MANIFEST_MAP[gameId];
  return Boolean(manifest && manifest.status === "published");
}

export function getGuestPersonalization(): PersistedPersonalizationState {
  if (typeof window === "undefined" || !window.localStorage) {
    return { version: 1, favoriteGameIds: [], recentPlays: [] };
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      return { version: 1, favoriteGameIds: [], recentPlays: [] };
    }

    const parsed = JSON.parse(raw);
    const favoriteGameIds = Array.isArray(parsed?.favoriteGameIds)
      ? parsed.favoriteGameIds.filter(
          (id: unknown): id is string => typeof id === "string" && isValidGame(id),
        )
      : [];

    const recentPlays = Array.isArray(parsed?.recentPlays)
      ? parsed.recentPlays
          .filter(
            (r: unknown): r is { gameId: string; lastPlayedAt: string } =>
              Boolean(r) &&
              typeof r === "object" &&
              r !== null &&
              "gameId" in r &&
              "lastPlayedAt" in r &&
              typeof (r as { gameId: unknown }).gameId === "string" &&
              isValidGame((r as { gameId: string }).gameId) &&
              typeof (r as { lastPlayedAt: unknown }).lastPlayedAt === "string",
          )
          .slice(0, 12)
      : [];

    return {
      version: 1,
      favoriteGameIds,
      recentPlays,
    };
  } catch {
    return { version: 1, favoriteGameIds: [], recentPlays: [] };
  }
}

export function saveGuestPersonalization(state: {
  favoriteGameIds: string[];
  recentPlays: { gameId: string; lastPlayedAt: string }[];
}): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const payload: PersistedPersonalizationState = {
      version: 1,
      favoriteGameIds: state.favoriteGameIds.filter(isValidGame),
      recentPlays: state.recentPlays.filter((r) => isValidGame(r.gameId)).slice(0, 12),
    };
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage write errors (quota exceeded or private mode)
  }
}

export function clearGuestPersonalization(): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    window.localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // Ignore storage clear error
  }
}
