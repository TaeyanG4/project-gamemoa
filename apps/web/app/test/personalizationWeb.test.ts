import test from "node:test";
import assert from "node:assert/strict";
import {
  getGuestPersonalization,
  saveGuestPersonalization,
  clearGuestPersonalization,
  LOCAL_STORAGE_KEY,
} from "../features/personalization/storage.js";

// Mock localStorage for Node.js test environment
class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

test("getGuestPersonalization handles empty or missing localStorage safely", () => {
  (globalThis as any).window = {
    localStorage: new MockLocalStorage(),
  };

  const state = getGuestPersonalization();
  assert.deepEqual(state.favoriteGameIds, []);
  assert.deepEqual(state.recentPlays, []);
});

test("saveGuestPersonalization persists valid published game IDs and filters invalid ones", () => {
  const mockStorage = new MockLocalStorage();
  (globalThis as any).window = {
    localStorage: mockStorage,
  };

  saveGuestPersonalization({
    favoriteGameIds: ["reaction-time", "invalid-game-slug"],
    recentPlays: [
      { gameId: "aim-test", lastPlayedAt: "2026-08-13T00:00:00Z" },
      { gameId: "deleted-game", lastPlayedAt: "2026-08-13T00:00:00Z" },
    ],
  });

  const state = getGuestPersonalization();
  assert.deepEqual(state.favoriteGameIds, ["reaction-time"]);
  assert.equal(state.recentPlays.length, 1);
  assert.equal(state.recentPlays[0].gameId, "aim-test");
});

test("getGuestPersonalization handles corrupted JSON in localStorage without throwing", () => {
  const mockStorage = new MockLocalStorage();
  mockStorage.setItem(LOCAL_STORAGE_KEY, "{ corrupted_json: true ");
  (globalThis as any).window = {
    localStorage: mockStorage,
  };

  const state = getGuestPersonalization();
  assert.deepEqual(state.favoriteGameIds, []);
  assert.deepEqual(state.recentPlays, []);
});

test("clearGuestPersonalization removes local storage key", () => {
  const mockStorage = new MockLocalStorage();
  mockStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify({ version: 1, favoriteGameIds: ["aim-test"] }),
  );
  (globalThis as any).window = {
    localStorage: mockStorage,
  };

  clearGuestPersonalization();
  assert.equal(mockStorage.getItem(LOCAL_STORAGE_KEY), null);
});
