import type { PersonalizationRepository } from "../ports/repositories.js";
import { GAME_MANIFEST_MAP } from "../registry/gameRegistry.generated.js";

export function isPublishedGame(gameId: string): boolean {
  if (!gameId || typeof gameId !== "string") return false;
  const manifest = GAME_MANIFEST_MAP[gameId];
  return Boolean(manifest && manifest.status === "published");
}

export interface PersonalizationState {
  favoriteGameIds: string[];
  recentPlays: { gameId: string; lastPlayedAt: string }[];
}

export class PersonalizationUseCases {
  constructor(private repo: PersonalizationRepository) {}

  async getPersonalizationState(userId: number): Promise<PersonalizationState> {
    const rawFavorites = await this.repo.getFavorites(userId);
    const rawRecent = await this.repo.getRecentPlays(userId, 12);

    const favoriteGameIds = rawFavorites.filter(isPublishedGame);
    const recentPlays = rawRecent.filter((r) => isPublishedGame(r.gameId));

    return {
      favoriteGameIds,
      recentPlays,
    };
  }

  async addFavorite(userId: number, gameId: string): Promise<void> {
    if (!isPublishedGame(gameId)) {
      throw new Error(`Invalid or unpublished game ID: ${gameId}`);
    }
    await this.repo.addFavorite(userId, gameId);
  }

  async removeFavorite(userId: number, gameId: string): Promise<void> {
    await this.repo.removeFavorite(userId, gameId);
  }

  async recordRecentPlay(userId: number, gameId: string): Promise<void> {
    if (!isPublishedGame(gameId)) {
      throw new Error(`Invalid or unpublished game ID: ${gameId}`);
    }
    await this.repo.recordRecentPlay(userId, gameId);
  }

  async importGuestData(
    userId: number,
    guestFavorites: string[],
    guestRecentPlays: { gameId: string; lastPlayedAt: string }[],
  ): Promise<PersonalizationState> {
    const validFavorites = (guestFavorites || []).filter(isPublishedGame);
    const validRecent = (guestRecentPlays || []).filter((r) => r && isPublishedGame(r.gameId));

    await this.repo.importGuestData(userId, validFavorites, validRecent);
    return this.getPersonalizationState(userId);
  }
}
