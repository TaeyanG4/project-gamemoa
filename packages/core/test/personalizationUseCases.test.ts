import test from "node:test";
import assert from "node:assert/strict";
import { PersonalizationUseCases } from "../src/application/personalizationUseCases.js";
import type { PersonalizationRepository } from "../src/ports/repositories.js";

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
  const useCases = new PersonalizationUseCases(repo);

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
  const useCases = new PersonalizationUseCases(repo);

  await useCases.recordRecentPlay(1, "reaction-time");
  await useCases.recordRecentPlay(1, "aim-test");
  await useCases.recordRecentPlay(1, "reaction-time"); // repeat play updates timestamp

  const state = await useCases.getPersonalizationState(1);
  assert.equal(state.recentPlays.length, 2);
  assert.equal(state.recentPlays[0].gameId, "reaction-time");
});

test("PersonalizationUseCases imports guest recent plays but NOT guest favorites", async () => {
  const repo = new MemoryPersonalizationRepository();
  const useCases = new PersonalizationUseCases(repo);

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
