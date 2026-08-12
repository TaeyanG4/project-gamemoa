import test from "node:test";
import assert from "node:assert/strict";
import { DiscordLinkUseCases } from "../src/application/discordLinkUseCases.js";
import type { DiscordLinkChallenge, DiscordLinkRepository } from "../src/ports/repositories.js";

class FakeDiscordLinkRepository implements DiscordLinkRepository {
  private challenges = new Map<string, DiscordLinkChallenge>();
  private nextToken = 1;

  async createChallenge(input: {
    discordUserId: string;
    discordUsername: string;
    ttlSeconds: number;
  }): Promise<{ token: string; expiresAt: string }> {
    const token = `token-${this.nextToken++}`;
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000).toISOString();
    this.challenges.set(token, {
      discordUserId: input.discordUserId,
      discordUsername: input.discordUsername,
      createdAt: new Date().toISOString(),
      expiresAt,
      consumedAt: null,
    });
    return { token, expiresAt };
  }

  async findChallengeByToken(token: string): Promise<DiscordLinkChallenge | null> {
    return this.challenges.get(token) ?? null;
  }

  async consumeChallengeByToken(token: string): Promise<void> {
    const challenge = this.challenges.get(token);
    if (challenge) challenge.consumedAt = new Date().toISOString();
  }

  // Test helper to force an expired/consumed state.
  seedRaw(token: string, challenge: DiscordLinkChallenge) {
    this.challenges.set(token, challenge);
  }
}

test("createLinkChallenge returns a token and delegates TTL to the repository", async () => {
  const repo = new FakeDiscordLinkRepository();
  const useCases = new DiscordLinkUseCases(repo);

  const { token, expiresAt } = await useCases.createLinkChallenge("111", "tester");
  assert.ok(token);
  assert.ok(new Date(expiresAt).getTime() > Date.now());
});

test("findValidChallenge returns the challenge for a fresh, unconsumed token", async () => {
  const repo = new FakeDiscordLinkRepository();
  const useCases = new DiscordLinkUseCases(repo);

  const { token } = await useCases.createLinkChallenge("111", "tester");
  const found = await useCases.findValidChallenge(token);
  assert.ok(found);
  assert.equal(found?.discordUserId, "111");
  assert.equal(found?.discordUsername, "tester");
});

test("findValidChallenge returns null for an unknown token", async () => {
  const repo = new FakeDiscordLinkRepository();
  const useCases = new DiscordLinkUseCases(repo);

  const found = await useCases.findValidChallenge("does-not-exist");
  assert.equal(found, null);
});

test("findValidChallenge returns null for an expired challenge", async () => {
  const repo = new FakeDiscordLinkRepository();
  const useCases = new DiscordLinkUseCases(repo);

  repo.seedRaw("expired-token", {
    discordUserId: "111",
    discordUsername: "tester",
    createdAt: new Date(Date.now() - 700_000).toISOString(),
    expiresAt: new Date(Date.now() - 100_000).toISOString(),
    consumedAt: null,
  });

  const found = await useCases.findValidChallenge("expired-token");
  assert.equal(found, null);
});

test("findValidChallenge returns null for an already-consumed challenge (replay protection)", async () => {
  const repo = new FakeDiscordLinkRepository();
  const useCases = new DiscordLinkUseCases(repo);

  const { token } = await useCases.createLinkChallenge("111", "tester");
  await useCases.consumeChallenge(token);

  const found = await useCases.findValidChallenge(token);
  assert.equal(found, null);
});

test("consumeChallenge is idempotent (consuming twice does not throw)", async () => {
  const repo = new FakeDiscordLinkRepository();
  const useCases = new DiscordLinkUseCases(repo);

  const { token } = await useCases.createLinkChallenge("111", "tester");
  await useCases.consumeChallenge(token);
  await assert.doesNotReject(() => useCases.consumeChallenge(token));
});
