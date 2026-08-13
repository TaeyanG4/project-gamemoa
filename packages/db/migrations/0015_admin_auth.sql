-- Migration 0015: Admin step-up authentication
--
-- ADMIN_USER_IDS (server config) remains the ROOT authorization boundary and is unchanged by
-- this migration. These tables add the elevated proof layer required before an eligible user
-- may actually exercise admin capabilities: a fresh Google step-up challenge, then an admin
-- username/password login, which together issue a short-lived admin session.
--
-- Every raw opaque token (challenge token, admin session token) is stored as a SHA-256 hash
-- only. Every challenge/session row is additionally bound to a hash of the underlying
-- `gamemoa_session` raw token, so an expired/rotated/revoked normal session immediately
-- invalidates anything built on top of it.

CREATE TABLE IF NOT EXISTS admin_step_up_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  google_sub TEXT NOT NULL,
  session_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_step_up_challenges_expiry
  ON admin_step_up_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_step_up_challenges_user
  ON admin_step_up_challenges(user_id);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  session_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_session_token
  ON admin_sessions(session_token_hash);

-- Rate-limit ledger for admin username/password attempts (Google step-up failures are not
-- counted here — only the second-factor password check). success is 0/1.
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  success INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_user_created
  ON admin_login_attempts(user_id, created_at);
