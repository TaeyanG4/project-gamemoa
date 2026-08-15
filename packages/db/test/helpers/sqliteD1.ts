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
  difficulty TEXT NOT NULL DEFAULT 'normal',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  deleted_by_admin_id INTEGER
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

/** Schema for D1SessionRepository's moderation-gate behavior (migration 0023) against a real
 * SQLite engine — the existing sessionRepository.test.ts uses a hand-rolled substring-matching
 * mock that doesn't actually validate the LEFT JOIN user_moderation SQL runs, so this schema
 * exists specifically to exercise the real query. */
export const SESSION_MODERATION_TEST_SCHEMA = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  country TEXT,
  nickname_updated_at TEXT,
  country_updated_at TEXT,
  locale TEXT,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date TEXT
);

CREATE TABLE oauth_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE user_moderation (
  user_id INTEGER PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  suspended_until TEXT,
  score_submission_blocked INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  updated_by_admin_id INTEGER,
  updated_at TEXT NOT NULL
);
`;

/** Schema for admin step-up authentication repository tests (migration 0015). */
export const ADMIN_AUTH_TEST_SCHEMA = `
CREATE TABLE admin_step_up_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  google_sub TEXT NOT NULL,
  session_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);

CREATE TABLE admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  session_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE admin_login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  success INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
`;

/** Schema for admin monitoring repository tests (DAU/WAU + per-game play counts, migration
 * 0022's indexes aren't needed for correctness here — SQLite doesn't require them to run the
 * same query, only to run it fast). */
export const ADMIN_MONITORING_TEST_SCHEMA = `
CREATE TABLE xp_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  game_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  nickname TEXT NOT NULL DEFAULT '게스트',
  avatar_url TEXT,
  game_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  deleted_by_admin_id INTEGER
);
`;

/** Schema for managed administrator account repository tests (migration 0016). */
export const ADMIN_ACCOUNTS_TEST_SCHEMA = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE admin_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  google_sub TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_by_admin_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  password_changed_at TEXT NOT NULL
);

CREATE TABLE admin_account_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_admin_id INTEGER,
  target_admin_id INTEGER,
  action TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
`;

/** Schema for D1UserModerationRepository tests (migration 0023). */
export const USER_MODERATION_TEST_SCHEMA = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  nickname TEXT NOT NULL DEFAULT '게스트',
  avatar_url TEXT,
  game_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  deleted_by_admin_id INTEGER
);

CREATE TABLE user_moderation (
  user_id INTEGER PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  suspended_until TEXT,
  score_submission_blocked INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  updated_by_admin_id INTEGER,
  updated_at TEXT NOT NULL
);

CREATE TABLE user_moderation_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  actor_admin_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
`;
