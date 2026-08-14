-- Migration: 0019_game_settings.sql
-- Purpose: Admin-controlled live enable/disable override per game. GameManifest.status
-- (draft/beta/published/hidden) is a static, build-time value baked into each game package
-- and shared with the Discord bot — it cannot be flipped without a code deploy. This table is
-- the live, DB-backed override an administrator can toggle from the Admin Center without a
-- deploy. Absence of a row for a game_id means "no override" — the manifest's own status
-- governs, so most games never need a row here at all.

CREATE TABLE IF NOT EXISTS game_settings (
  game_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  disabled_reason TEXT,
  updated_by_admin_id INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
