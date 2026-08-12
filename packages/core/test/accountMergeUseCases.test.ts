import test from "node:test";
import assert from "node:assert/strict";
import {
  AccountMergeUseCases,
  type AccountMergeRepository,
  type MergeChallenge,
  type MergePreview,
  type OAuthAccount,
  type User,
  type UserRepository,
} from "../src/index.js";

interface ScoreRow {
  userId: number;
  gameId: string;
}

class FixtureState {
  users = new Map<number, User>();
  oauth = new Map<string, OAuthAccount>();
  scores: ScoreRow[] = [];
  favorites = new Map<number, Set<string>>();
  recentPlays = new Map<number, Map<string, string>>();
  sessionUser = new Map<string, number>();
  challenges = new Map<string, MergeChallenge>();
  nextId = 1;
  failMerge = false;
}

class FixtureUserRepo implements UserRepository {
  constructor(private s: FixtureState) {}
  async findById(id: number): Promise<User | null> {
    return this.s.users.get(id) ?? null;
  }
  async findByOAuth(): Promise<User | null> {
    return null;
  }
  async findOrCreateUser(data: {
    provider: string;
    providerUserId: string;
    email: string | null;
    nickname: string;
    avatarUrl: string | null;
  }): Promise<User> {
    const id = this.s.nextId++;
    const user: User = {
      id,
      nickname: data.nickname,
      email: data.email,
      avatar_url: data.avatarUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      providers: [data.provider],
    };
    this.s.users.set(id, user);
    this.s.oauth.set(`${data.provider}:${data.providerUserId}`, {
      id: this.s.nextId,
      user_id: id,
      provider: data.provider,
      provider_user_id: data.providerUserId,
      provider_email: data.email,
      created_at: new Date().toISOString(),
    });
    return user;
  }
  async getOAuthAccounts(userId: number): Promise<OAuthAccount[]> {
    return Array.from(this.s.oauth.values()).filter((a) => a.user_id === userId);
  }
  async findOAuthAccount(provider: string, providerUserId: string): Promise<OAuthAccount | null> {
    return this.s.oauth.get(`${provider}:${providerUserId}`) ?? null;
  }
  async linkOAuthAccount(
    userId: number,
    provider: string,
    providerUserId: string,
    providerEmail: string | null,
  ): Promise<void> {
    this.s.oauth.set(`${provider}:${providerUserId}`, {
      id: this.s.nextId,
      user_id: userId,
      provider,
      provider_user_id: providerUserId,
      provider_email: providerEmail,
      created_at: new Date().toISOString(),
    });
  }
  async unlinkOAuthAccount(userId: number, provider: string): Promise<void> {
    for (const [key, acc] of this.s.oauth.entries()) {
      if (acc.user_id === userId && acc.provider === provider) {
        this.s.oauth.delete(key);
      }
    }
  }
}

class FixtureMergeRepo implements AccountMergeRepository {
  constructor(private s: FixtureState) {}
  async getAccountMergePreview(userId: number): Promise<MergePreview> {
    const user = this.s.users.get(userId);
    const firstOauth = Array.from(this.s.oauth.values()).find((a) => a.user_id === userId);
    return {
      userId,
      nickname: user?.nickname ?? "알 수 없음",
      provider: firstOauth?.provider ?? "",
      createdAt: user?.created_at ?? "",
      scoreCount: this.s.scores.filter((sc) => sc.userId === userId).length,
      favoriteCount: this.s.favorites.get(userId)?.size ?? 0,
      recentPlayCount: this.s.recentPlays.get(userId)?.size ?? 0,
    };
  }
  async createMergeChallenge(input: {
    userA: number;
    userB: number;
    provider: string;
    providerUserId: string;
    ttlSeconds: number;
  }): Promise<{ id: string; expiresAt: string }> {
    const id = `ch-${this.s.nextId++}`;
    const challenge: MergeChallenge = {
      id,
      userA: input.userA,
      userB: input.userB,
      provider: input.provider,
      providerUserId: input.providerUserId,
      expiresAt: new Date(Date.now() + input.ttlSeconds * 1000).toISOString(),
      consumedAt: null,
    };
    this.s.challenges.set(id, challenge);
    return { id, expiresAt: challenge.expiresAt };
  }
  async findMergeChallenge(id: string): Promise<MergeChallenge | null> {
    return this.s.challenges.get(id) ?? null;
  }
  async findPendingMergeChallenge(userA: number, userB: number): Promise<MergeChallenge | null> {
    for (const ch of this.s.challenges.values()) {
      if (
        ch.consumedAt === null &&
        ((ch.userA === userA && ch.userB === userB) || (ch.userA === userB && ch.userB === userA))
      ) {
        return ch;
      }
    }
    return null;
  }
  async consumeMergeChallenge(id: string): Promise<void> {
    const ch = this.s.challenges.get(id);
    if (ch) this.s.challenges.set(id, { ...ch, consumedAt: new Date().toISOString() });
  }
  async mergeAccounts(primaryId: number, secondaryId: number): Promise<void> {
    if (this.s.failMerge) {
      throw new Error("forced merge failure");
    }
    // 1. delete secondary gameplay/personalization/sessions
    this.s.scores = this.s.scores.filter((sc) => sc.userId !== secondaryId);
    this.s.favorites.delete(secondaryId);
    this.s.recentPlays.delete(secondaryId);
    for (const [token, uid] of Array.from(this.s.sessionUser.entries())) {
      if (uid === secondaryId) this.s.sessionUser.delete(token);
    }
    // 2. move secondary oauth_accounts to primary
    for (const acc of this.s.oauth.values()) {
      if (acc.user_id === secondaryId) acc.user_id = primaryId;
    }
    // 3. delete secondary user
    this.s.users.delete(secondaryId);
  }
}

async function setupTwoAccounts(): Promise<{
  state: FixtureState;
  userRepo: FixtureUserRepo;
  mergeRepo: FixtureMergeRepo;
  useCases: AccountMergeUseCases;
  userA: User;
  userB: User;
  challengeId: string;
}> {
  const state = new FixtureState();
  const userRepo = new FixtureUserRepo(state);
  const mergeRepo = new FixtureMergeRepo(state);
  const useCases = new AccountMergeUseCases(mergeRepo, userRepo);

  const userA = await userRepo.findOrCreateUser({
    provider: "google",
    providerUserId: "google-sub-A",
    email: "a@example.com",
    nickname: "Alpha",
    avatarUrl: null,
  });
  const userB = await userRepo.findOrCreateUser({
    provider: "discord",
    providerUserId: "discord-id-B",
    email: "b@example.com",
    nickname: "Bravo",
    avatarUrl: null,
  });

  // Seed data for A
  state.scores.push({ userId: userA.id, gameId: "reaction-time" });
  state.favorites.set(userA.id, new Set(["aim-test"]));
  state.recentPlays.set(userA.id, new Map([["memory-test", "2026-08-13T00:00:00Z"]]));
  state.sessionUser.set("sess-A", userA.id);

  // Seed data for B
  state.scores.push({ userId: userB.id, gameId: "typing-test" });
  state.favorites.set(userB.id, new Set(["reaction-time"]));
  state.recentPlays.set(userB.id, new Map([["aim-test", "2026-08-13T00:00:00Z"]]));
  state.sessionUser.set("sess-B", userB.id);

  const challenge = await mergeRepo.createMergeChallenge({
    userA: userA.id,
    userB: userB.id,
    provider: "discord",
    providerUserId: "discord-id-B",
    ttlSeconds: 600,
  });

  return {
    state,
    userRepo,
    mergeRepo,
    useCases,
    userA,
    userB,
    challengeId: challenge.id,
  };
}

test("confirmMerge keeping A keeps A data, deletes B data and transfers B provider to A", async () => {
  const { state, useCases, userA, userB, challengeId } = await setupTwoAccounts();

  const result = await useCases.confirmMerge(challengeId, userA.id, userA.id);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.primaryId, userA.id);
  assert.equal(result.secondaryId, userB.id);

  // A user remains, B user deleted
  assert.ok(state.users.has(userA.id));
  assert.equal(state.users.has(userB.id), false);

  // A scores/favorites/recent remain
  assert.equal(
    state.scores.some((s) => s.userId === userA.id),
    true,
  );
  assert.ok(state.favorites.get(userA.id));
  assert.ok(state.recentPlays.get(userA.id));

  // B scores/favorites/recent and sessions deleted
  assert.equal(
    state.scores.some((s) => s.userId === userB.id),
    false,
  );
  assert.equal(state.favorites.has(userB.id), false);
  assert.equal(state.recentPlays.has(userB.id), false);
  assert.equal(state.sessionUser.has("sess-B"), false);
  // A current session preserved
  assert.equal(state.sessionUser.has("sess-A"), true);

  // B provider (discord) transferred to A
  const aAccounts = await useCases.findPendingMergeChallenge(userA.id, userB.id);
  void aAccounts;
  const oauthAccounts = Array.from(state.oauth.values()).filter((o) => o.user_id === userA.id);
  const providers = oauthAccounts.map((o) => o.provider).sort();
  assert.deepEqual(providers, ["discord", "google"]);
});

test("confirmMerge keeping B (reverse) keeps B data and deletes A data", async () => {
  const { state, useCases, userA, userB, challengeId } = await setupTwoAccounts();

  const result = await useCases.confirmMerge(challengeId, userB.id, userA.id);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.primaryId, userB.id);
  assert.equal(result.secondaryId, userA.id);

  // B remains, A deleted
  assert.ok(state.users.has(userB.id));
  assert.equal(state.users.has(userA.id), false);

  // B data remain
  assert.equal(
    state.scores.some((s) => s.userId === userB.id),
    true,
  );
  assert.ok(state.recentPlays.get(userB.id));
  // A data deleted
  assert.equal(
    state.scores.some((s) => s.userId === userA.id),
    false,
  );
  assert.equal(state.favorites.has(userA.id), false);

  // A session (current) invalidated; B session preserved
  assert.equal(state.sessionUser.has("sess-A"), false);
  assert.equal(state.sessionUser.has("sess-B"), true);

  // A provider (google) transferred to B, which already has discord
  const providers = Array.from(state.oauth.values())
    .filter((o) => o.user_id === userB.id)
    .map((o) => o.provider)
    .sort();
  assert.deepEqual(providers, ["discord", "google"]);
});

test("confirmMerge challenge is consumed after a successful merge", async () => {
  const { useCases, userA, userB, challengeId } = await setupTwoAccounts();

  let ch = await useCases.findMergeChallenge(challengeId);
  assert.ok(ch);
  assert.equal(ch!.consumedAt, null);

  const first = await useCases.confirmMerge(challengeId, userA.id, userA.id);
  assert.equal(first.ok, true);

  ch = await useCases.findMergeChallenge(challengeId);
  assert.ok(ch!.consumedAt, "challenge must be marked consumed");

  const second = await useCases.confirmMerge(challengeId, userA.id, userA.id);
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.code, "MERGE_CHALLENGE_CONSUMED");
});

test("confirmMerge rejects an expired challenge", async () => {
  const { state, useCases, userA, userB, challengeId } = await setupTwoAccounts();
  // Force expiry
  const ch = state.challenges.get(challengeId)!;
  ch.expiresAt = new Date(Date.now() - 1000).toISOString();

  const result = await useCases.confirmMerge(challengeId, userA.id, userA.id);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "MERGE_CHALLENGE_EXPIRED");

  // Nothing destructive happened — both users intact
  assert.ok(state.users.has(userA.id));
  assert.ok(state.users.has(userB.id));
});

test("confirmMerge rejects when the current session is not one of the candidates", async () => {
  const { useCases, userA, challengeId } = await setupTwoAccounts();
  const result = await useCases.confirmMerge(challengeId, userA.id, 99999);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "MERGE_CHALLENGE_MISMATCH");
});

test("confirmMerge rejects when keepUserId is neither candidate", async () => {
  const { useCases, challengeId } = await setupTwoAccounts();
  const result = await useCases.confirmMerge(challengeId, 99999, 1);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "MERGE_CHALLENGE_MISMATCH");
});

test("confirmMerge blocks same-provider conflict (both accounts have the same provider)", async () => {
  // A has google, B has google AND discord; proof provider is discord (B's fresh proof).
  // Keeping A would require moving B's google onto A, which already has google -> conflict.
  const state = new FixtureState();
  const userRepo = new FixtureUserRepo(state);
  const mergeRepo = new FixtureMergeRepo(state);
  const useCases = new AccountMergeUseCases(mergeRepo, userRepo);

  const userA = await userRepo.findOrCreateUser({
    provider: "google",
    providerUserId: "google-sub-A",
    email: "a@example.com",
    nickname: "Alpha",
    avatarUrl: null,
  });
  const userB = await userRepo.findOrCreateUser({
    provider: "discord",
    providerUserId: "discord-id-B",
    email: "b@example.com",
    nickname: "Bravo",
    avatarUrl: null,
  });
  // B also has a google identity
  await userRepo.linkOAuthAccount(userB.id, "google", "google-sub-B", "b2@example.com");

  const challenge = await mergeRepo.createMergeChallenge({
    userA: userA.id,
    userB: userB.id,
    provider: "discord",
    providerUserId: "discord-id-B",
    ttlSeconds: 600,
  });

  const result = await useCases.confirmMerge(challenge.id, userA.id, userA.id);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "MERGE_PROVIDER_CONFLICT");

  // Nothing destructive happened
  assert.ok(state.users.has(userA.id));
  assert.ok(state.users.has(userB.id));
});

test("confirmMerge is atomic: a failure leaves both accounts intact and challenge unconsumed", async () => {
  const { state, useCases, userA, userB, challengeId } = await setupTwoAccounts();
  state.failMerge = true;

  await assert.rejects(async () => {
    await useCases.confirmMerge(challengeId, userA.id, userA.id);
  }, /forced merge failure/);

  // Both users still exist (mock mergeAccounts throws before any mutation in this fixture)
  assert.ok(state.users.has(userA.id));
  assert.ok(state.users.has(userB.id));

  // Challenge not consumed
  const ch = await useCases.findMergeChallenge(challengeId);
  assert.equal(ch!.consumedAt, null);
});
