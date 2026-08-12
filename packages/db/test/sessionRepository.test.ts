import test from "node:test";
import assert from "node:assert/strict";
import { D1SessionRepository, hashSessionToken } from "../src/d1/D1SessionRepository.js";
import type { D1Database } from "../src/d1/D1UserRepository.js";

function createMockD1Database(): {
  db: D1Database;
  sessionsTable: Map<
    string,
    { id: string; user_id: number; created_at: string; expires_at: string }
  >;
  usersTable: Map<
    number,
    { id: number; nickname: string; email: string | null; avatar_url: string | null }
  >;
  oauthTable: Map<string, { user_id: number; provider: string }>;
} {
  const sessionsTable = new Map<
    string,
    { id: string; user_id: number; created_at: string; expires_at: string }
  >();
  const usersTable = new Map<
    number,
    { id: number; nickname: string; email: string | null; avatar_url: string | null }
  >();
  const oauthTable = new Map<string, { user_id: number; provider: string }>();

  // Seed user
  usersTable.set(1, {
    id: 1,
    nickname: "TestGamer",
    email: "gamer@test.com",
    avatar_url: null,
  });

  const db: D1Database = {
    prepare(query: string) {
      let boundArgs: any[] = [];
      const stmt = {
        bind(...args: any[]) {
          boundArgs = args;
          return stmt;
        },
        async run() {
          if (query.startsWith("INSERT INTO sessions")) {
            const [id, user_id, created_at, expires_at] = boundArgs;
            sessionsTable.set(id, { id, user_id, created_at, expires_at });
          } else if (query.startsWith("UPDATE sessions SET id")) {
            const [newId, oldId] = boundArgs;
            const existing = sessionsTable.get(oldId);
            if (existing) {
              sessionsTable.delete(oldId);
              sessionsTable.set(newId, { ...existing, id: newId });
            }
          } else if (query.startsWith("DELETE FROM sessions")) {
            if (boundArgs.length === 2) {
              sessionsTable.delete(boundArgs[0]);
              sessionsTable.delete(boundArgs[1]);
            } else {
              sessionsTable.delete(boundArgs[0]);
            }
          }
          return { success: true, meta: {} };
        },
        async first<T = Record<string, unknown>>(): Promise<T | null> {
          if (query.includes("FROM sessions s")) {
            const sessionId = boundArgs[0];
            const session = sessionsTable.get(sessionId);
            if (!session) return null;
            const user = usersTable.get(session.user_id);
            if (!user) return null;

            return {
              session_id: session.id,
              user_id: session.user_id,
              session_created_at: session.created_at,
              expires_at: session.expires_at,
              nickname: user.nickname,
              email: user.email,
              avatar_url: user.avatar_url,
              user_created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as unknown as T;
          }
          return null;
        },
        async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
          if (query.includes("FROM oauth_accounts")) {
            const userId = boundArgs[0];
            const results: T[] = [];
            for (const item of oauthTable.values()) {
              if (item.user_id === userId) {
                results.push({ provider: item.provider } as unknown as T);
              }
            }
            return { results };
          }
          return { results: [] };
        },
      };
      return stmt as any;
    },
    async batch() {
      return [];
    },
  };

  return { db, sessionsTable, usersTable, oauthTable };
}

test("D1SessionRepository hashes session token in DB and returns raw token", async () => {
  const { db, sessionsTable } = createMockD1Database();
  const repo = new D1SessionRepository(db);

  const session = await repo.createSession(1, 30);
  assert.ok(session.id);
  assert.equal(session.user_id, 1);

  const hashedToken = await hashSessionToken(session.id);

  // Database must NOT store raw session.id
  assert.equal(sessionsTable.has(session.id), false, "Raw session token must NOT be stored in DB");
  assert.equal(sessionsTable.has(hashedToken), true, "Hashed session token MUST be stored in DB");

  // Lookup using raw token must succeed via hash lookup
  const found = await repo.findSession(session.id);
  assert.ok(found);
  assert.equal(found.user.id, 1);
  assert.equal(found.user.nickname, "TestGamer");
});

test("D1SessionRepository supports legacy raw token and migrates it to hashed token", async () => {
  const { db, sessionsTable } = createMockD1Database();
  const repo = new D1SessionRepository(db);

  const legacyRawToken = "legacy_raw_session_token_12345";
  const expiresAt = new Date(Date.now() + 86400000).toISOString();

  // Directly seed legacy raw row into DB
  sessionsTable.set(legacyRawToken, {
    id: legacyRawToken,
    user_id: 1,
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
  });

  assert.equal(sessionsTable.has(legacyRawToken), true);

  // findSession with legacy token
  const found = await repo.findSession(legacyRawToken);
  assert.ok(found);
  assert.equal(found.user.id, 1);

  // Check that legacy row was transparently migrated to hashed token!
  const hashedToken = await hashSessionToken(legacyRawToken);
  assert.equal(
    sessionsTable.has(legacyRawToken),
    false,
    "Legacy raw token must be removed from DB",
  );
  assert.equal(sessionsTable.has(hashedToken), true, "Migrated hashed token must exist in DB");
});

test("D1SessionRepository rejects expired sessions and deletes token", async () => {
  const { db, sessionsTable } = createMockD1Database();
  const repo = new D1SessionRepository(db);

  const rawToken = "expired_raw_token";
  const hashedToken = await hashSessionToken(rawToken);
  const expiredAt = new Date(Date.now() - 3600000).toISOString();

  sessionsTable.set(hashedToken, {
    id: hashedToken,
    user_id: 1,
    created_at: new Date().toISOString(),
    expires_at: expiredAt,
  });

  const found = await repo.findSession(rawToken);
  assert.equal(found, null);
  assert.equal(sessionsTable.has(hashedToken), false, "Expired session must be deleted");
});

test("D1SessionRepository deleteSession removes hashed token", async () => {
  const { db, sessionsTable } = createMockD1Database();
  const repo = new D1SessionRepository(db);

  const session = await repo.createSession(1, 30);
  const hashedToken = await hashSessionToken(session.id);
  assert.equal(sessionsTable.has(hashedToken), true);

  await repo.deleteSession(session.id);
  assert.equal(sessionsTable.has(hashedToken), false);
});
