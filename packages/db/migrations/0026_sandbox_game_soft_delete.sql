-- Migration 0026: soft delete for sandbox_games (games/maps uploaded through the Game Creator
-- program). Mirrors the existing scores.deleted_at pattern from migration 0023 — a deleted game's
-- row and its versions are kept (audit trail, reversible in principle), not hard-deleted. Storage
-- objects (B2) are left in place; a future version-GC pass (already anticipated in
-- sourceArchiveObjectKey's doc comment, packages/core/src/domain/sandboxGameBundle.ts) is a
-- separate concern from this migration.
--
-- ADDITIVE ONLY — two new nullable columns, no existing data touched, no row loss possible.

ALTER TABLE sandbox_games ADD COLUMN deleted_at TEXT;
ALTER TABLE sandbox_games ADD COLUMN deleted_by_admin_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_sandbox_games_deleted_at ON sandbox_games(deleted_at);
