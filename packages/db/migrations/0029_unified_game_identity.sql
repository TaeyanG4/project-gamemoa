-- Migration: 0029_unified_game_identity.sql
-- Unified Game Platform, Stage A-2 — physical storage foundation for generic game identity & runtime state.
--
-- Introduces the provider-neutral `games` table to store identity and runtime state for both
-- OWOGG (official) and USER (creator) published games, completely decoupled from canonical
-- metadata (stored in B2 `game-definitions/<slug>/definition.json`) and UGC review lifecycle
-- (which stays in `sandbox_games` / `sandbox_game_versions`).
--
-- IMPORTANT (Shared ID Namespace & Shadow Storage Invariant):
-- 1. This migration backfills all existing `sandbox_games` rows into `games` preserving exact numeric IDs (`games.id = sandbox_games.id`).
-- 2. Until Stage A-3 (USER Identity Write Convergence), `games` is a shadow read model and NOT yet the production write/read authority.
-- 3. Production OWOGG rows must NOT be inserted until Stage A-3 write convergence is complete to prevent ID collision.

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

  CHECK (
    visibility IN ('PRIVATE', 'PUBLIC')
  ),

  CHECK (
    live_version_id IS NULL
    OR live_version_id > 0
  ),

  CHECK (
    visibility = 'PRIVATE'
    OR live_version_id IS NOT NULL
  ),

  CHECK (
    length(slug) > 0
    AND slug = trim(slug)
  )
);

-- Backfill existing USER games from sandbox_games preserving exact primary key IDs.
INSERT INTO games (
  id,
  slug,
  publisher_type,
  publisher_user_id,
  visibility,
  live_version_id,
  deleted_at,
  created_at,
  updated_at
)
SELECT
  id,
  slug,
  'USER',
  developer_user_id,
  visibility,
  live_version_id,
  deleted_at,
  created_at,
  updated_at
FROM sandbox_games;

-- Index for publisher-based queries (e.g. all games by a creator or all OWOGG games)
CREATE INDEX idx_games_publisher ON games(publisher_type, publisher_user_id);

-- Partial index for active runtime candidate enumeration
CREATE INDEX idx_games_active_created ON games(created_at DESC) WHERE deleted_at IS NULL;
