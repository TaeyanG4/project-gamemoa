-- Additive migration: 0023_user_moderation.sql
-- Admin user moderation: temporary suspension / permanent ban (blocks login), an independent
-- score-submission block (lighter tool — user can still log in, just can't submit scores), an
-- append-only audit log of every moderation action, and soft-delete support on `scores` so a
-- "reset this user's scores" action can be undone (restored) rather than being an unrecoverable
-- hard delete.

-- One row per user that has ever been moderated at least once — same "no row = never touched,
-- default clean state" pattern as game_settings (migration 0019). `status` stays on the row
-- (rather than being deleted on unsuspend/unban) so there's a persistent "this user has a
-- moderation history" signal even after they're back to ACTIVE.
CREATE TABLE user_moderation (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | SUSPENDED | BANNED
  -- Only meaningful when status = 'SUSPENDED'. NULL for ACTIVE/BANNED. A SUSPENDED row whose
  -- suspended_until has already passed is treated as expired (login allowed again) without
  -- requiring an explicit admin unsuspend action — see findSession's moderation check.
  suspended_until TEXT,
  score_submission_blocked INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  updated_by_admin_id INTEGER,
  updated_at TEXT NOT NULL
);

-- Append-only audit log — mirrors creator_review_audit_log / admin_account_audit_log's pattern.
-- No UPDATE/DELETE path is exposed anywhere in the API.
CREATE TABLE user_moderation_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  actor_admin_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- SUSPENDED | BANNED | UNSUSPENDED | SCORE_SUBMISSION_BLOCKED | SCORE_SUBMISSION_UNBLOCKED | SCORES_RESET | SCORES_RESTORED
  reason TEXT,
  -- e.g. { "suspendedUntil": "...", "affectedScoreCount": 12 } — free-form per action type.
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_user_moderation_audit_log_user ON user_moderation_audit_log(user_id, created_at);

-- Soft-delete for scores. Every existing scores query has been updated to add
-- `AND deleted_at IS NULL` (see D1ScoreRepository, D1CreatorRepository, D1DiscordGuildRepository,
-- D1AdminMonitoringRepository) — a soft-deleted score becomes invisible to leaderboards/personal
-- bests/rankings immediately, but the row (and the ability to restore it) is preserved.
ALTER TABLE scores ADD COLUMN deleted_at TEXT;
ALTER TABLE scores ADD COLUMN deleted_by_admin_id INTEGER;

CREATE INDEX idx_scores_user_deleted ON scores(user_id, deleted_at);
