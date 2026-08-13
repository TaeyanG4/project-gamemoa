import { GAME_MANIFEST_MAP } from "@owogg/core";

export const LOCAL_STORAGE_KEY = "owogg.personalization.v2";
export const LEGACY_STORAGE_KEY = "owogg.personalization.v1";

export interface PersistedPersonalizationState {
  version: number;
  recentPlays: { gameId: string; lastPlayedAt: string }[];
}

function isValidGame(gameId: string): boolean {
  if (!gameId || typeof gameId !== "string") return false;
  const manifest = GAME_MANIFEST_MAP[gameId];
  return Boolean(manifest && manifest.status === "published");
}

function parseRecentPlays(parsed: unknown): { gameId: string; lastPlayedAt: string }[] {
  if (!Array.isArray(parsed)) return [];
  return parsed
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
    .slice(0, 12);
}

export function getGuestPersonalization(): PersistedPersonalizationState {
  if (typeof window === "undefined" || !window.localStorage) {
    return { version: 2, recentPlays: [] };
  }

  try {
    // Prefer current v2 storage schema (recent plays only, no guest favorites).
    const rawV2 = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      return {
        version: 2,
        recentPlays: parseRecentPlays(parsed?.recentPlays),
      };
    }

    // Migrate legacy v1 storage: preserve recent plays, discard guest favorites.
    const rawV1 = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawV1) {
      const parsed = JSON.parse(rawV1);
      const recentPlays = parseRecentPlays(parsed?.recentPlays);

      // Persist migrated v2 state and remove legacy key.
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ version: 2, recentPlays }));
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // Ignore storage write errors (quota exceeded or private mode)
      }

      return { version: 2, recentPlays };
    }

    return { version: 2, recentPlays: [] };
  } catch {
    // Corrupt JSON or unknown schema: reset to safe empty v2 state.
    return { version: 2, recentPlays: [] };
  }
}

export function saveGuestPersonalization(state: {
  recentPlays: { gameId: string; lastPlayedAt: string }[];
}): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const payload: PersistedPersonalizationState = {
      version: 2,
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
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore storage clear error
  }
}
