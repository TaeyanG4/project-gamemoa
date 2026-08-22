import test from "node:test";
import assert from "node:assert/strict";
import {
  getGuestPersonalization,
  saveGuestPersonalization,
  clearGuestPersonalization,
  LOCAL_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
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

function mockWindow(storage: MockLocalStorage) {
  (globalThis as unknown as { window?: { localStorage?: unknown } }).window = {
    localStorage: storage,
  };
}

test("getGuestPersonalization handles empty or missing localStorage safely", () => {
  const mockStorage = new MockLocalStorage();
  mockWindow(mockStorage);

  const state = getGuestPersonalization();
  assert.deepEqual(state.recentPlays, []);
  assert.equal(state.version, 2);
});

test("saveGuestPersonalization persists slug-shaped recent plays and filters malformed ones", () => {
  const mockStorage = new MockLocalStorage();
  mockWindow(mockStorage);

  saveGuestPersonalization({
    recentPlays: [
      { gameId: "aim-test", lastPlayedAt: "2026-08-13T00:00:00Z" },
      { gameId: "../deleted-game", lastPlayedAt: "2026-08-13T00:00:00Z" },
    ],
  });

  const state = getGuestPersonalization();
  assert.equal(state.recentPlays.length, 1);
  assert.equal(state.recentPlays[0]?.gameId, "aim-test");
});

test("v1 -> v2 storage migration discards guest favorites and preserves recent plays", () => {
  const mockStorage = new MockLocalStorage();
  // Seed legacy v1 storage with guest favorites and recent plays.
  mockStorage.setItem(
    LEGACY_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      favoriteGameIds: ["reaction-time", "aim-test"],
      recentPlays: [{ gameId: "aim-test", lastPlayedAt: "2026-08-13T00:00:00Z" }],
    }),
  );
  mockWindow(mockStorage);

  const state = getGuestPersonalization();

  // Guest favorites must be discarded
  assert.deepEqual((state as { favoriteGameIds?: string[] }).favoriteGameIds ?? [], []);

  // Recent plays must be preserved
  assert.equal(state.recentPlays.length, 1);
  assert.equal(state.recentPlays[0]?.gameId, "aim-test");

  // v1 legacy key must be removed and v2 key must exist
  assert.equal(mockStorage.getItem(LEGACY_STORAGE_KEY), null);
  assert.ok(mockStorage.getItem(LOCAL_STORAGE_KEY) !== null);
});

test("getGuestPersonalization handles corrupted JSON in localStorage without throwing", () => {
  const mockStorage = new MockLocalStorage();
  mockStorage.setItem(LOCAL_STORAGE_KEY, "{ corrupted_json: true ");
  mockWindow(mockStorage);

  const state = getGuestPersonalization();
  assert.deepEqual(state.recentPlays, []);
});

test("clearGuestPersonalization removes local storage key", () => {
  const mockStorage = new MockLocalStorage();
  mockStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ version: 2, recentPlays: [] }));
  mockWindow(mockStorage);

  clearGuestPersonalization();
  assert.equal(mockStorage.getItem(LOCAL_STORAGE_KEY), null);
});
