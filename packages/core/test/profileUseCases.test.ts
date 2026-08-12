import test from "node:test";
import assert from "node:assert/strict";
import { ProfileUseCases } from "../src/application/profileUseCases.js";
import type { OAuthAccount, User, UserRepository } from "../src/ports/repositories.js";

class FakeUserRepository implements UserRepository {
  users = new Map<number, User>();

  seed(user: User) {
    this.users.set(user.id, user);
  }

  async findById(id: number): Promise<User | null> {
    return this.users.get(id) ?? null;
  }
  async findByOAuth(): Promise<User | null> {
    return null;
  }
  async findOrCreateUser(): Promise<User> {
    throw new Error("not used in this test");
  }
  async getOAuthAccounts(): Promise<OAuthAccount[]> {
    return [];
  }
  async findOAuthAccount(): Promise<OAuthAccount | null> {
    return null;
  }
  async linkOAuthAccount(): Promise<void> {}
  async unlinkOAuthAccount(): Promise<void> {}

  async updateNickname(userId: number, nickname: string, updatedAt: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("user not found");
    const updated: User = { ...user, nickname, nickname_updated_at: updatedAt };
    this.users.set(userId, updated);
    return updated;
  }

  async updateCountry(userId: number, country: string | null, updatedAt: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("user not found");
    const updated: User = { ...user, country, country_updated_at: updatedAt };
    this.users.set(userId, updated);
    return updated;
  }
}

function baseUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    nickname: "OldName",
    email: "a@example.com",
    avatar_url: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    nickname_updated_at: null,
    country: null,
    country_updated_at: null,
    ...overrides,
  };
}

test("updateNickname succeeds on first change (no prior cooldown)", async () => {
  const repo = new FakeUserRepository();
  repo.seed(baseUser());
  const useCases = new ProfileUseCases(repo);

  const result = await useCases.updateNickname(1, "NewName");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.user.nickname, "NewName");
});

test("updateNickname rejects invalid input without touching cooldown", async () => {
  const repo = new FakeUserRepository();
  repo.seed(baseUser());
  const useCases = new ProfileUseCases(repo);

  const result = await useCases.updateNickname(1, "");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "INVALID_NICKNAME");
});

test("updateNickname blocks a second change inside the cooldown window", async () => {
  const repo = new FakeUserRepository();
  repo.seed(baseUser({ nickname_updated_at: new Date().toISOString() }));
  const useCases = new ProfileUseCases(repo);

  const result = await useCases.updateNickname(1, "AnotherName");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "NICKNAME_COOLDOWN_ACTIVE");
});

test("updateNickname allows a change once the cooldown has elapsed", async () => {
  const repo = new FakeUserRepository();
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  repo.seed(baseUser({ nickname_updated_at: eightDaysAgo }));
  const useCases = new ProfileUseCases(repo);

  const result = await useCases.updateNickname(1, "FreshName");
  assert.equal(result.ok, true);
});

test("updateNickname reports USER_NOT_FOUND for a missing user", async () => {
  const repo = new FakeUserRepository();
  const useCases = new ProfileUseCases(repo);

  const result = await useCases.updateNickname(999, "Name");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "USER_NOT_FOUND");
});

test("updateCountry succeeds on first change and normalizes casing", async () => {
  const repo = new FakeUserRepository();
  repo.seed(baseUser());
  const useCases = new ProfileUseCases(repo);

  const result = await useCases.updateCountry(1, "kr");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.user.country, "KR");
});

test("updateCountry rejects an invalid ISO code", async () => {
  const repo = new FakeUserRepository();
  repo.seed(baseUser());
  const useCases = new ProfileUseCases(repo);

  const result = await useCases.updateCountry(1, "Korea");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "INVALID_COUNTRY");
});

test("updateCountry blocks a second change inside its (longer) cooldown window", async () => {
  const repo = new FakeUserRepository();
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  repo.seed(baseUser({ country: "KR", country_updated_at: tenDaysAgo }));
  const useCases = new ProfileUseCases(repo);

  // Nickname's cooldown (7 days) would have allowed this by now, but country's cooldown (30) must not.
  const result = await useCases.updateCountry(1, "JP");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "COUNTRY_COOLDOWN_ACTIVE");
});

test("updateCountry accepts unsetting the country back to null", async () => {
  const repo = new FakeUserRepository();
  repo.seed(baseUser());
  const useCases = new ProfileUseCases(repo);

  const result = await useCases.updateCountry(1, null);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.user.country, null);
});
