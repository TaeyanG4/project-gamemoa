import type { PersonalizationRepository } from "../ports/repositories.js";
import type { PublicGameCatalog } from "./publicGameCatalog.js";

export interface PersonalizationState {
  favoriteGameIds: string[];
  recentPlays: { gameId: string; lastPlayedAt: string }[];
}

/** Unreachable today (the catalog has 4 games total), but favorites are meant to hold up once
 * user-submitted games ship (see docs/GAME_CREATION_GUIDE.md's user-game-registration design) —
 * cheap to cap now rather than needing to retrofit a limit once it's actually possible to hit. */
export const MAX_FAVORITES = 50;

export class PersonalizationUseCases {
  constructor(
    private repo: PersonalizationRepository,
    private games: PublicGameCatalog,
  ) {}

  async getPersonalizationState(userId: number): Promise<PersonalizationState> {
    const [rawFavorites, rawRecent, publicGames] = await Promise.all([
      this.repo.getFavorites(userId),
      this.repo.getRecentPlays(userId, 12),
      this.games.list(),
    ]);
    const publicIds = new Set(publicGames.map((game) => game.identity.slug));

    const favoriteGameIds = rawFavorites.filter((gameId) => publicIds.has(gameId));
    const recentPlays = rawRecent.filter((record) => publicIds.has(record.gameId));

    return {
      favoriteGameIds,
      recentPlays,
    };
  }

  async addFavorite(userId: number, gameId: string): Promise<void> {
    if (!(await this.games.findBySlug(gameId))) {
      throw new Error(`Invalid or unpublished game ID: ${gameId}`);
    }

    // addFavorite is idempotent at the repo layer (INSERT OR IGNORE) — re-favoriting an
    // already-favorited game must stay a no-op even when already at the cap, so the count check
    // only applies to genuinely NEW favorites.
    const current = await this.repo.getFavorites(userId);
    if (!current.includes(gameId) && current.length >= MAX_FAVORITES) {
      throw new Error(`FAVORITE_LIMIT_REACHED: max ${MAX_FAVORITES} favorites`);
    }

    await this.repo.addFavorite(userId, gameId);
  }

  async removeFavorite(userId: number, gameId: string): Promise<void> {
    await this.repo.removeFavorite(userId, gameId);
  }

  async recordRecentPlay(userId: number, gameId: string): Promise<void> {
    if (!(await this.games.findBySlug(gameId))) {
      throw new Error(`Invalid or unpublished game ID: ${gameId}`);
    }
    await this.repo.recordRecentPlay(userId, gameId);
  }

  async importGuestData(
    userId: number,
    guestRecentPlays: { gameId: string; lastPlayedAt: string }[],
  ): Promise<PersonalizationState> {
    const publicIds = new Set((await this.games.list()).map((game) => game.identity.slug));
    const validRecent = (guestRecentPlays || []).filter(
      (record) => record && publicIds.has(record.gameId),
    );

    await this.repo.importGuestData(userId, validRecent);
    return this.getPersonalizationState(userId);
  }
}
