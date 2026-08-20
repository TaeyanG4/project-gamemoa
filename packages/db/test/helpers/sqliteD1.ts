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
      const runSync = () => {
        const info = stmt.run(...(bound as never[]));
        // node:sqlite's own `changes` count and Cloudflare D1's `rows_written` field mean the
        // same thing for a plain INSERT — mirrored under both names so a caller reading either
        // one (see D1CreatorScoreAcceptanceRepository, which reads rows_written specifically)
        // gets a real, correctly-populated value rather than undefined.
        return {
          success: true,
          meta: { changes: Number(info.changes), rows_written: Number(info.changes) },
        };
      };
      const wrapper: D1PreparedStatement & { __runSync: typeof runSync } = {
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
          return runSync();
        },
        // Batch-only escape hatch — see batch() below for why this exists.
        __runSync: runSync,
      };
      return wrapper;
    },
    async batch(statements: D1PreparedStatement[]) {
      // Real D1 executes an entire batch() call as one uninterruptible unit — no other
      // concurrent request's statements can land in between. A naive `for (...) { await s.run() }`
      // does NOT model that: even though the underlying node:sqlite call is itself synchronous,
      // wrapping it in `async run()` still yields a microtask between each statement, and under
      // `Promise.all`-driven concurrent calls another call's own batch can interleave its
      // statements in that gap. That silently breaks any logic (like a `changes()`-gated second
      // INSERT) that depends on nothing else running on the connection between this batch's own
      // statements. Fix: run every statement's underlying SQLite call synchronously back-to-back,
      // via the sync escape hatch above, with no `await` — and therefore no interleaving
      // opportunity — between them. Only the outer batch() call is async, matching the real
      // D1Database interface.
      return statements.map((s) =>
        (s as D1PreparedStatement & { __runSync: () => unknown }).__runSync(),
      );
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

CREATE TABLE admin_permission_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  permission TEXT NOT NULL,
  granted_by_admin_id INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE (account_id, permission)
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

/** Schema for D1GameCreatorRepository / D1SandboxGameRepository tests (migration 0024, renamed +
 * extended by migration 0025 — see that file's comment for why this is a pure table rename). */
export const SANDBOX_GAMES_TEST_SCHEMA = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE game_creator_access (
  user_id INTEGER PRIMARY KEY,
  granted_by_admin_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE game_creator_access_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_user_id INTEGER NOT NULL,
  actor_admin_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE game_creator_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  message TEXT,
  reviewed_by_admin_id INTEGER,
  reviewed_at TEXT,
  reject_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_game_creator_applications_user
  ON game_creator_applications(user_id, created_at DESC);

CREATE UNIQUE INDEX idx_game_creator_applications_one_pending_per_user
  ON game_creator_applications(user_id) WHERE status = 'PENDING';

CREATE TABLE sandbox_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  developer_user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  genre TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'single',
  logo_key TEXT,
  xp_per_completion INTEGER NOT NULL DEFAULT 0,
  score_unit TEXT,
  score_direction TEXT,
  score_min INTEGER,
  score_max INTEGER,
  score_display_prefix TEXT,
  score_display_suffix TEXT,
  visibility TEXT NOT NULL DEFAULT 'PRIVATE',
  live_version_id INTEGER,
  review_slot INTEGER,
  deleted_at TEXT,
  deleted_by_admin_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (visibility = 'PRIVATE' OR live_version_id IS NOT NULL),
  CHECK (review_slot IS NULL OR review_slot IN (1, 2))
);

CREATE INDEX idx_sandbox_games_deleted_at ON sandbox_games(deleted_at);

CREATE UNIQUE INDEX idx_sandbox_games_review_slot
  ON sandbox_games(developer_user_id, review_slot)
  WHERE review_slot IS NOT NULL;

CREATE TABLE sandbox_game_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  object_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  bundle_bytes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  reviewed_by_admin_id INTEGER,
  reviewed_at TEXT,
  reject_reason TEXT,
  uploaded_at TEXT NOT NULL,
  publish_status TEXT NOT NULL DEFAULT 'UPLOADED',
  publish_error TEXT,
  published_at TEXT,
  manifest_key TEXT,
  published_size_bytes INTEGER,
  file_count INTEGER
);

CREATE TABLE sandbox_game_review_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  version_id INTEGER,
  actor_admin_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
`;

/** Schema for D1GameAttemptConsumptionRepository tests (migration 0028) — the minimal slice of
 * SANDBOX_GAMES_TEST_SCHEMA the FK columns need (users, sandbox_games, sandbox_game_versions)
 * plus the table itself. */
export const GAME_ATTEMPT_CONSUMPTIONS_TEST_SCHEMA = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sandbox_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  developer_user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  genre TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'PRIVATE',
  live_version_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sandbox_game_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  object_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  bundle_bytes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  uploaded_at TEXT NOT NULL
);

CREATE TABLE game_attempt_consumptions (
  attempt_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  version_id INTEGER NOT NULL,
  consumed_at TEXT NOT NULL
);
`;

/** Schema for D1CreatorScoreAcceptanceRepository tests (migration 0028's table again, plus
 * `scores` from the initial schema) — the atomic attempt-consume + score-save write. */
export const CREATOR_SCORE_ACCEPTANCE_TEST_SCHEMA = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sandbox_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  developer_user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  genre TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'PRIVATE',
  live_version_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sandbox_game_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  object_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  bundle_bytes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  uploaded_at TEXT NOT NULL
);

CREATE TABLE game_attempt_consumptions (
  attempt_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  version_id INTEGER NOT NULL,
  consumed_at TEXT NOT NULL
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
`;

/** Schema for generic games table tests (migration 0029) — includes users, sandbox_games, and games. */
export const GAMES_TEST_SCHEMA = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sandbox_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  developer_user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  genre TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'single',
  logo_key TEXT,
  xp_per_completion INTEGER NOT NULL DEFAULT 0,
  score_unit TEXT,
  score_direction TEXT,
  score_min INTEGER,
  score_max INTEGER,
  score_display_prefix TEXT,
  score_display_suffix TEXT,
  visibility TEXT NOT NULL DEFAULT 'PRIVATE',
  live_version_id INTEGER,
  review_slot INTEGER,
  deleted_at TEXT,
  deleted_by_admin_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (visibility = 'PRIVATE' OR live_version_id IS NOT NULL),
  CHECK (review_slot IS NULL OR review_slot IN (1, 2))
);

CREATE TABLE games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  publisher_type TEXT NOT NULL,
  publisher_user_id INTEGER REFERENCES users(id),
  visibility TEXT NOT NULL,
  live_version_id INTEGER,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (publisher_type IN ('OWOGG', 'USER')),
  CHECK (
    (
      publisher_type = 'OWOGG'
      AND publisher_user_id IS NULL
    )
    OR
    (
      publisher_type = 'USER'
      AND publisher_user_id IS NOT NULL
      AND publisher_user_id > 0
    )
  ),
  CHECK (visibility IN ('PRIVATE', 'PUBLIC')),
  CHECK (live_version_id IS NULL OR live_version_id > 0),
  CHECK (visibility = 'PRIVATE' OR live_version_id IS NOT NULL),
  CHECK (length(slug) > 0 AND slug = trim(slug))
);

CREATE INDEX idx_games_publisher ON games(publisher_type, publisher_user_id);
CREATE INDEX idx_games_active_created ON games(created_at DESC) WHERE deleted_at IS NULL;
`;
