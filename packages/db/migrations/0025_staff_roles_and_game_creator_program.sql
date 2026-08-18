-- Migration 0025: Staff Role unification (SUPERADMIN/ADMIN -> ADMIN/OPERATOR/MODERATOR/
-- SYSTEM_DEVELOPER) + Game Creator program (rename game_developers -> game_creator_access,
-- add a self-serve application flow alongside the existing admin-direct grant path).
--
-- See docs/AUTHORIZATION.md for the full role/permission/program model this supports.
--
-- SAFETY: every step here is either a pure rename (ALTER TABLE ... RENAME, no rows touched) or a
-- data-preserving UPDATE. No row is ever deleted. No existing administrator or game developer
-- loses access as a result of this migration.

-- ── 1. Staff role unification ────────────────────────────────────────────────
--
-- Old model: admin_accounts.role IN ('SUPERADMIN', 'ADMIN'), where SUPERADMIN was the sole
-- account-management-capable tier and the (lesser) ADMIN tier had every other elevated-admin
-- capability (users/games/creators/sandbox-games/monitoring — see apps/api/src/routes/admin*.ts,
-- none of which ever checked role beyond "is there an active managed account").
--
-- New model: role IN ('ADMIN', 'OPERATOR', 'MODERATOR', 'SYSTEM_DEVELOPER'), where ADMIN is now
-- the ONE top role (absorbing what SUPERADMIN did) and OPERATOR is the new name for the same
-- capability level the old lesser ADMIN tier already had. Every existing administrator keeps
-- exactly the same effective capability level after this migration — nobody is downgraded.
--
-- Order matters: the OPERATOR rename must run BEFORE the ADMIN rename, or the second UPDATE
-- would also catch the rows the first one just wrote (both use the literal 'ADMIN').
UPDATE admin_accounts SET role = 'OPERATOR' WHERE role = 'ADMIN';
UPDATE admin_accounts SET role = 'ADMIN' WHERE role = 'SUPERADMIN';

-- Individual permission delegation — e.g. granting a trusted SYSTEM_DEVELOPER `admin.center.access`
-- without making them a full ADMIN/OPERATOR (see docs/AUTHORIZATION.md §"admin.center.access").
-- Permission strings are validated in the domain layer (packages/core/src/domain/staffRoles.ts),
-- not by a DB CHECK constraint, so the catalog can grow without a migration.
CREATE TABLE IF NOT EXISTS admin_permission_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  permission TEXT NOT NULL,
  granted_by_admin_id INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES admin_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by_admin_id) REFERENCES admin_accounts(id) ON DELETE SET NULL,
  UNIQUE (account_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_admin_permission_grants_account
  ON admin_permission_grants(account_id);

-- ── 2. Game Creator program ──────────────────────────────────────────────────
--
-- Renames the existing invite-only "game developer" upload-permission tables in place — every
-- existing row, key, and foreign-key relationship is preserved byte-for-byte; only the table
-- name changes. This is what packages/core now calls GameCreatorAccess
-- (see domain/gameCreator.ts): "approved to use the sandbox game upload/publish pipeline",
-- never a staff role. The associated index (idx_game_developer_audit_log_target) is left under
-- its original name — SQLite tracks it by the table's internal id, not by name, so it continues
-- to work correctly against the renamed table; renaming it is cosmetic only and not worth a
-- rebuild.
ALTER TABLE game_developers RENAME TO game_creator_access;
ALTER TABLE game_developer_audit_log RENAME TO game_creator_access_audit_log;

-- Self-serve application flow (new) — a regular user can now request Game Creator access
-- instead of only ever being invited by an admin/operator. The existing admin-direct grant()
-- path in GameCreatorUseCases is UNCHANGED and still works (e.g. inviting a known partner
-- without requiring them to apply first) — this table is additive, not a replacement.
--
-- canApplyForGameCreator() (packages/core/src/domain/gameCreator.ts) is the policy hook for a
-- future OwO Plus eligibility gate on this table — no subscription system exists yet in this
-- codebase, so today the policy unconditionally allows applying. See docs/AUTHORIZATION.md.
CREATE TABLE IF NOT EXISTS game_creator_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  -- 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
  status TEXT NOT NULL DEFAULT 'PENDING',
  message TEXT,
  reviewed_by_admin_id INTEGER,
  reviewed_at TEXT,
  reject_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by_admin_id) REFERENCES admin_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_game_creator_applications_user
  ON game_creator_applications(user_id, created_at DESC);

-- At most one PENDING application per user at a time — DB-enforced via a partial unique index
-- rather than a race-prone "count, then insert" in application code, mirroring the
-- sandbox_games.review_slot pattern in packages/db/migrations/0024_sandbox_games.sql.
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_creator_applications_one_pending_per_user
  ON game_creator_applications(user_id) WHERE status = 'PENDING';
