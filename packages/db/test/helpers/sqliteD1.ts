// eslint-disable-next-line import/no-unresolved -- Node 22 built-in, requires --experimental-sqlite
import { DatabaseSync } from "node:sqlite";
import type { D1Database, D1PreparedStatement } from "../../src/d1/D1UserRepository.js";

/**
 * Real SQLite-backed D1Database test double (Node's built-in `node:sqlite`, no native
 * dependency — run with NODE_OPTIONS=--experimental-sqlite, see package.json `test` script).
 *
 * The hand-rolled in-memory mocks used elsewhere in this package re-implement application
 * logic in JS and therefore cannot catch SQL-level regressions (bad window function syntax,
 * wrong JOIN cardinality, wrong bind order). This adapter runs the *actual* production SQL
 * text against a real SQLite engine — the same dialect Cloudflare D1 uses — so leaderboard
 * correctness tests exercise the real query, not a re-implementation of it.
 */
export function createSqliteD1(schemaSql: string): { db: D1Database; raw: DatabaseSync } {
  const raw = new DatabaseSync(":memory:");
  raw.exec(schemaSql);

  const db: D1Database = {
    prepare(query: string): D1PreparedStatement {
      const stmt = raw.prepare(query);
      let bound: unknown[] = [];
      const wrapper: D1PreparedStatement = {
        bind(...values: unknown[]) {
          bound = values;
          return wrapper;
        },
        async first<T>(): Promise<T | null> {
          const row = stmt.get(...(bound as never[]));
          return (row ?? null) as T | null;
        },
        async all<T>(): Promise<{ results: T[] }> {
          const rows = stmt.all(...(bound as never[]));
          return { results: rows as T[] };
        },
        async run() {
          const info = stmt.run(...(bound as never[]));
          return { success: true, meta: { changes: Number(info.changes) } };
        },
      };
      return wrapper;
    },
    async batch(statements: D1PreparedStatement[]) {
      const results = [];
      for (const s of statements) {
        results.push(await s.run());
      }
      return results;
    },
  };

  return { db, raw };
}

/** Minimal schema covering the tables the leaderboard/ranking queries touch. */
export const LEADERBOARD_TEST_SCHEMA = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  country TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  nickname TEXT NOT NULL DEFAULT '게스트',
  avatar_url TEXT,
  game_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE creator_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  featured_status TEXT NOT NULL DEFAULT 'NONE',
  featured_reason TEXT,
  featured_since TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE creator_platform_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL,
  platform TEXT NOT NULL,
  platform_user_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_handle TEXT,
  channel_url TEXT NOT NULL,
  avatar_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
  verified_at TEXT,
  audience_count INTEGER DEFAULT 0,
  audience_count_known INTEGER NOT NULL DEFAULT 0,
  channel_created_at TEXT,
  metrics_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE user_progress (
  user_id INTEGER PRIMARY KEY,
  total_xp INTEGER NOT NULL DEFAULT 0,
  eligible_completions INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;
