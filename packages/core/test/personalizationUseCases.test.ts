import test from "node:test";
import assert from "node:assert/strict";
import {
  PersonalizationUseCases,
  MAX_FAVORITES,
} from "../src/application/personalizationUseCases.js";
import type { PersonalizationRepository } from "../src/ports/repositories.js";
import type { PublicGameCatalog } from "../src/application/publicGameCatalog.js";
import { runtimeGameFixture, TEST_GAME_SLUGS } from "./runtimeGameFixture.js";

const games: PublicGameCatalog = {
  async findBySlug(slug) {
    return TEST_GAME_SLUGS.includes(slug as (typeof TEST_GAME_SLUGS)[number])
      ? runtimeGameFixture(slug)
      : null;
  },
  async list() {
    return TEST_GAME_SLUGS.map((slug) => runtimeGameFixture(slug));
  },
};

class MemoryPersonalizationRepository implements PersonalizationRepository {
  favorites = new Map<number, Set<string>>();
  recentPlays = new Map<number, Map<string, string>>();

  async getFavorites(userId: number): Promise<string[]> {
    return Array.from(this.favorites.get(userId) || []);
  }

  async addFavorite(userId: number, gameId: string): Promise<void> {
    if (!this.favorites.has(userId)) {
      this.favorites.set(userId, new Set());
    }
    this.favorites.get(userId)!.add(gameId);
  }

  async removeFavorite(userId: number, gameId: string): Promise<void> {
    this.favorites.get(userId)?.delete(gameId);
  }

  async getRecentPlays(
    userId: number,
    limit = 12,
  ): Promise<{ gameId: string; lastPlayedAt: string }[]> {
    const userMap = this.recentPlays.get(userId) || new Map();
    const list = Array.from(userMap.entries()).map(([gameId, lastPlayedAt]) => ({
      gameId,
      lastPlayedAt,
    }));
    list.sort((a, b) => b.lastPlayedAt.localeCompare(a.lastPlayedAt));
    return list.slice(0, limit);
  }

  async recordRecentPlay(userId: number, gameId: string, playedAt?: string): Promise<void> {
    if (!this.recentPlays.has(userId)) {
      this.recentPlays.set(userId, new Map());
    }
    this.recentPlays.get(userId)!.set(gameId, playedAt || new Date().toISOString());
  }

  async importGuestData(
    userId: number,
    guestRecentPlays: { gameId: string; lastPlayedAt: string }[],
  ): Promise<void> {
    for (const r of guestRecentPlays) {
      await this.recordRecentPlay(userId, r.gameId, r.lastPlayedAt);
    }
  }
}

test("PersonalizationUseCases handles favorites idempotently and rejects unknown games", async () => {
  const repo = new MemoryPersonalizationRepository();
  const useCases = new PersonalizationUseCases(repo, games);

  // Add published game
  await useCases.addFavorite(1, "reaction-time");
  await useCases.addFavorite(1, "reaction-time"); // idempotent
  await useCases.addFavorite(1, "aim-test");

  const state = await useCases.getPersonalizationState(1);
  assert.deepEqual(state.favoriteGameIds, ["reaction-time", "aim-test"]);

  // Reject invalid/unpublished game
  await assert.rejects(async () => {
    await useCases.addFavorite(1, "non-existent-game");
  }, /Invalid or unpublished game ID/);
});

test("PersonalizationUseCases handles recent plays deduplication and limit", async () => {
  const repo = new MemoryPersonalizationRepository();
  const useCases = new PersonalizationUseCases(repo, games);

  await useCases.recordRecentPlay(1, "reaction-time");
  await useCases.recordRecentPlay(1, "aim-test");
  await useCases.recordRecentPlay(1, "reaction-time"); // repeat play updates timestamp

  const state = await useCases.getPersonalizationState(1);
  assert.equal(state.recentPlays.length, 2);
  assert.equal(state.recentPlays[0].gameId, "reaction-time");
});

test("PersonalizationUseCases rejects a new favorite once at the cap, but re-favoriting an existing one still no-ops", async () => {
  const repo = new MemoryPersonalizationRepository();
  const useCases = new PersonalizationUseCases(repo, games);

  // Seed MAX_FAVORITES entries directly (bypasses isPublishedGame — the catalog only has 4 real
  // games today, so this is the only way to exercise a cap that's otherwise unreachable).
  repo.favorites.set(1, new Set(Array.from({ length: MAX_FAVORITES }, (_, i) => `fake-game-${i}`)));

  // A genuinely new favorite is rejected once at the cap.
  await assert.rejects(async () => {
    await useCases.addFavorite(1, "reaction-time");
  }, /FAVORITE_LIMIT_REACHED/);

  const state = await useCases.getPersonalizationState(1);
  assert.equal(state.favoriteGameIds.length, 0); // all seeded ids are unpublished, filtered out

  // Re-adding a favorite that's already in the set stays a no-op even at the cap.
  repo.favorites.get(1)!.add("aim-test");
  await useCases.addFavorite(1, "aim-test");
  const afterReadd = await repo.getFavorites(1);
  assert.equal(afterReadd.filter((id) => id === "aim-test").length, 1);
});

test("PersonalizationUseCases imports guest recent plays but NOT guest favorites", async () => {
  const repo = new MemoryPersonalizationRepository();
  const useCases = new PersonalizationUseCases(repo, games);

  // Pre-existing account state
  await useCases.addFavorite(1, "reaction-time");
  await useCases.recordRecentPlay(1, "aim-test");

  // Guest data to import: only recent plays (favorites are no longer imported)
  const guestRecent = [
    { gameId: "typing-test", lastPlayedAt: "2026-08-13T00:00:00Z" },
    { gameId: "invalid-game", lastPlayedAt: "2026-08-13T00:00:00Z" },
  ];

  const state = await useCases.importGuestData(1, guestRecent);

  // Favorites must remain only the pre-existing account favorite (no guest favorites imported)
  assert.deepEqual(state.favoriteGameIds, ["reaction-time"]);

  // Valid recent plays only (invalid game filtered out)
  const recentIds = state.recentPlays.map((r) => r.gameId);
  assert.ok(recentIds.includes("aim-test"));
  assert.ok(recentIds.includes("typing-test"));
  assert.ok(!recentIds.includes("invalid-game"));
});
