import test from "node:test";
import assert from "node:assert/strict";
import { D1DiscordLinkRepository } from "../src/d1/D1DiscordLinkRepository.js";
import type { D1Database } from "../src/d1/D1UserRepository.js";

interface ChallengeRow {
  token_hash: string;
  discord_user_id: string;
  discord_username: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
}

function createMockD1(): { db: D1Database; rows: Map<string, ChallengeRow> } {
  const rows = new Map<string, ChallengeRow>();

  const db: D1Database = {
    prepare(query: string) {
      let bound: unknown[] = [];
      const stmt = {
        bind(...args: unknown[]) {
          bound = args;
          return stmt;
        },
        async first<T = unknown>(): Promise<T | null> {
          if (query.startsWith("SELECT discord_user_id")) {
            const [tokenHash] = bound as [string];
            const row = rows.get(tokenHash);
            return (row ?? null) as unknown as T;
          }
          return null;
        },
        async all<T = unknown>(): Promise<{ results: T[] }> {
          return { results: [] };
        },
        async run(): Promise<{ success: boolean }> {
          if (query.startsWith("INSERT INTO discord_link_challenges")) {
            const [tokenHash, discordUserId, discordUsername, createdAt, expiresAt] = bound as [
              string,
              string,
              string,
              string,
              string,
            ];
            rows.set(tokenHash, {
              token_hash: tokenHash,
              discord_user_id: discordUserId,
              discord_username: discordUsername,
              created_at: createdAt,
              expires_at: expiresAt,
              consumed_at: null,
            });
          } else if (query.startsWith("UPDATE discord_link_challenges SET consumed_at")) {
            const [tokenHash] = bound as [string];
            const row = rows.get(tokenHash);
            if (row) row.consumed_at = new Date().toISOString();
          }
          return { success: true };
        },
      };
      return stmt as unknown as ReturnType<D1Database["prepare"]>;
    },
    async batch() {
      return [];
    },
  };

  return { db, rows };
}

test("createChallenge stores only the token hash, never the raw token", async () => {
  const { db, rows } = createMockD1();
  const repo = new D1DiscordLinkRepository(db);

  const { token } = await repo.createChallenge({
    discordUserId: "111",
    discordUsername: "tester",
    ttlSeconds: 600,
  });

  assert.ok(token);
  for (const row of rows.values()) {
    assert.notEqual(row.token_hash, token, "raw token must never be stored");
  }
  assert.equal(rows.size, 1);
});

test("findChallengeByToken resolves the raw token back to its stored data via hashing", async () => {
  const { db } = createMockD1();
  const repo = new D1DiscordLinkRepository(db);

  const { token } = await repo.createChallenge({
    discordUserId: "222",
    discordUsername: "someone",
    ttlSeconds: 600,
  });

  const found = await repo.findChallengeByToken(token);
  assert.ok(found);
  assert.equal(found?.discordUserId, "222");
  assert.equal(found?.discordUsername, "someone");
  assert.equal(found?.consumedAt, null);
});

test("findChallengeByToken returns null for a token that was never issued", async () => {
  const { db } = createMockD1();
  const repo = new D1DiscordLinkRepository(db);

  const found = await repo.findChallengeByToken("never-issued");
  assert.equal(found, null);
});

test("consumeChallengeByToken marks the challenge consumed", async () => {
  const { db } = createMockD1();
  const repo = new D1DiscordLinkRepository(db);

  const { token } = await repo.createChallenge({
    discordUserId: "333",
    discordUsername: "consumer",
    ttlSeconds: 600,
  });

  await repo.consumeChallengeByToken(token);
  const found = await repo.findChallengeByToken(token);
  assert.ok(found?.consumedAt);
});

test("two challenges for different Discord users produce different token hashes", async () => {
  const { db, rows } = createMockD1();
  const repo = new D1DiscordLinkRepository(db);

  await repo.createChallenge({ discordUserId: "a", discordUsername: "a", ttlSeconds: 600 });
  await repo.createChallenge({ discordUserId: "b", discordUsername: "b", ttlSeconds: 600 });

  assert.equal(rows.size, 2);
});
