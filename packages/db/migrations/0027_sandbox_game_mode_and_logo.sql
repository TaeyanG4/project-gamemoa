-- Migration 0027: mode (single/multi) and logo for sandbox_games (2026-08-18 — the drag-and-drop
-- owogg.game.json path is now the only registration path, and both fields are required on it:
-- "single"/"multi" player-count metadata, and a required logo image (packages/core/src/domain/
-- sandboxGameBundle.ts's LOGO_BASENAME/sandboxGameLogoObjectKey). Existing rows predate both
-- requirements — `mode` gets a safe DEFAULT so they don't need backfilling, and `logo_key` stays
-- nullable (no logo == web catalog falls back to the site favicon, not an error state).
--
-- ADDITIVE ONLY — two new columns (one with a default, one nullable), no existing data touched,
-- no row loss possible.

ALTER TABLE sandbox_games ADD COLUMN mode TEXT NOT NULL DEFAULT 'single';
ALTER TABLE sandbox_games ADD COLUMN logo_key TEXT;
