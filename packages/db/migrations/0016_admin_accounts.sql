-- Migration 0016: Managed administrator accounts (D1)
--
-- ADMIN_USER_IDS (server config) remains the ROOT/bootstrap eligibility boundary and is
-- unchanged by this migration. This table becomes the ONGOING administrator authority source
-- once at least one active row exists, replacing the operability problem of the env-only
-- ADMIN_LOGIN_USERNAME/ADMIN_PASSWORD_PBKDF2 pair (a GitHub Secret edit per new administrator).
--
-- Every admin account maps 1:1 to an existing OwOGG user (user_id) and the canonical Google
-- OIDC `sub` already linked to that same user via `oauth_accounts` (google) at the time the
-- account is created — never a freestanding credential, and never authorized by email/nickname.
--
-- password_hash stores only a PBKDF2 record (see apps/api/src/auth/adminPassword.ts) — plaintext
-- is never persisted anywhere.

CREATE TABLE IF NOT EXISTS admin_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  google_sub TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  -- 'SUPERADMIN' | 'ADMIN'
  role TEXT NOT NULL DEFAULT 'ADMIN',
  -- 'ACTIVE' | 'DISABLED'
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_by_admin_id INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  password_changed_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_admin_id) REFERENCES admin_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_accounts_status ON admin_accounts(status);

-- Append-only administrator audit log — mirrors creator_review_audit_log's immutability pattern.
-- Never stores plaintext password, password hash, session token, or Google token; metadata_json
-- is limited to safe structured fields (e.g. { "role": "ADMIN" }, { "reason": "..." }).
CREATE TABLE IF NOT EXISTS admin_account_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_admin_id INTEGER,
  target_admin_id INTEGER,
  -- 'ADMIN_CREATED' | 'ADMIN_DISABLED' | 'ADMIN_ENABLED' | 'ROLE_CHANGED' |
  -- 'PASSWORD_CHANGED' | 'PASSWORD_RESET' | 'SESSIONS_REVOKED'
  action TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (actor_admin_id) REFERENCES admin_accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (target_admin_id) REFERENCES admin_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_account_audit_log_target
  ON admin_account_audit_log(target_admin_id, created_at DESC);

CREATE TRIGGER IF NOT EXISTS prevent_admin_account_audit_update
BEFORE UPDATE ON admin_account_audit_log
BEGIN
  SELECT RAISE(ABORT, 'admin account audit log is immutable');
END;

CREATE TRIGGER IF NOT EXISTS prevent_admin_account_audit_delete
BEFORE DELETE ON admin_account_audit_log
BEGIN
  SELECT RAISE(ABORT, 'admin account audit log is immutable');
END;
