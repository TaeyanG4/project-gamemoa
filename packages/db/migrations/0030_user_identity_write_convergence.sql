-- Migration: 0030_user_identity_write_convergence.sql
-- Unified Game Platform, Stage A-3 — USER identity write convergence & transitional sync triggers.
--
-- Goals:
-- 1. Delta convergence: Sync any existing USER rows from sandbox_games into games that were created
--    or updated during the deployment gap between migration 0029 and 0030.
-- 2. Authority parity guard: Fail-closed verification that every sandbox_games row has exact parity
--    with games and no authority conflicts (e.g. same ID or slug with OWOGG games) exist.
-- 3. Transitional sync triggers: AFTER INSERT, AFTER UPDATE, AFTER DELETE triggers on sandbox_games
--    to ensure zero-gap real-time replication from legacy/transitional sandbox_games writes into games.

-- -------------------------------------------------------------------------------------------------
-- 1. Existing USER Delta Convergence (repair stale or missing USER generic rows)
-- -------------------------------------------------------------------------------------------------

-- Insert any missing USER rows into games
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
  sg.id,
  sg.slug,
  'USER',
  sg.developer_user_id,
  sg.visibility,
  sg.live_version_id,
  sg.deleted_at,
  sg.created_at,
  sg.updated_at
FROM sandbox_games sg
LEFT JOIN games g ON g.id = sg.id
WHERE g.id IS NULL;

-- Update any stale USER rows in games to match sandbox_games authority
UPDATE games
SET
  slug = (SELECT sg.slug FROM sandbox_games sg WHERE sg.id = games.id),
  publisher_user_id = (SELECT sg.developer_user_id FROM sandbox_games sg WHERE sg.id = games.id),
  visibility = (SELECT sg.visibility FROM sandbox_games sg WHERE sg.id = games.id),
  live_version_id = (SELECT sg.live_version_id FROM sandbox_games sg WHERE sg.id = games.id),
  deleted_at = (SELECT sg.deleted_at FROM sandbox_games sg WHERE sg.id = games.id),
  created_at = (SELECT sg.created_at FROM sandbox_games sg WHERE sg.id = games.id),
  updated_at = (SELECT sg.updated_at FROM sandbox_games sg WHERE sg.id = games.id)
WHERE games.publisher_type = 'USER'
  AND EXISTS (
    SELECT 1 FROM sandbox_games sg
    WHERE sg.id = games.id
      AND (
        games.slug <> sg.slug
        OR games.publisher_user_id <> sg.developer_user_id
        OR games.visibility <> sg.visibility
        OR games.live_version_id IS NOT sg.live_version_id
        OR games.deleted_at IS NOT sg.deleted_at
        OR games.created_at <> sg.created_at
        OR games.updated_at <> sg.updated_at
      )
  );

-- -------------------------------------------------------------------------------------------------
-- 2. Authority & Parity Guard (Fail-Closed Migration Check)
-- -------------------------------------------------------------------------------------------------

-- Create a migration-local scratch check table to ensure zero delta/conflict exists.
-- This intentionally uses normal DDL rather than TEMP: Cloudflare's remote D1 authorizer
-- rejects TEMP table DDL during migrations. The table is dropped before successful completion.
-- If any sandbox_games row is missing or mismatched in games (e.g. collision with OWOGG row),
-- the CHECK constraint will immediately abort the migration.
CREATE TABLE _migration_0030_parity_guard (
  must_be_zero INTEGER CHECK (must_be_zero = 0)
);

INSERT INTO _migration_0030_parity_guard (must_be_zero)
SELECT COUNT(*) FROM sandbox_games sg
LEFT JOIN games g ON g.id = sg.id
WHERE g.id IS NULL
   OR g.publisher_type <> 'USER'
   OR g.slug <> sg.slug
   OR g.publisher_user_id <> sg.developer_user_id
   OR g.visibility <> sg.visibility
   OR g.live_version_id IS NOT sg.live_version_id
   OR g.deleted_at IS NOT sg.deleted_at
   OR g.created_at <> sg.created_at
   OR g.updated_at <> sg.updated_at;

DROP TABLE _migration_0030_parity_guard;

-- -------------------------------------------------------------------------------------------------
-- 3. Transitional Sync Triggers on sandbox_games
-- -------------------------------------------------------------------------------------------------

CREATE TRIGGER trg_sandbox_games_after_insert
AFTER INSERT ON sandbox_games
FOR EACH ROW
BEGIN
  -- Authority Guard: Refuse insert if matching games row has OWOGG authority
  SELECT RAISE(ABORT, 'Authority conflict: cannot insert USER sandbox game on top of OWOGG identity')
  WHERE EXISTS (
    SELECT 1 FROM games
    WHERE id = NEW.id AND publisher_type = 'OWOGG'
  );

  -- Authority Guard: Refuse insert if slug is already claimed by an OWOGG game
  SELECT RAISE(ABORT, 'Authority conflict: slug is reserved by OWOGG game')
  WHERE EXISTS (
    SELECT 1 FROM games
    WHERE slug = NEW.slug AND id <> NEW.id AND publisher_type = 'OWOGG'
  );

  -- Sync USER identity to games table
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
  ) VALUES (
    NEW.id,
    NEW.slug,
    'USER',
    NEW.developer_user_id,
    NEW.visibility,
    NEW.live_version_id,
    NEW.deleted_at,
    NEW.created_at,
    NEW.updated_at
  )
  ON CONFLICT(id) DO UPDATE SET
    slug = NEW.slug,
    publisher_type = 'USER',
    publisher_user_id = NEW.developer_user_id,
    visibility = NEW.visibility,
    live_version_id = NEW.live_version_id,
    deleted_at = NEW.deleted_at,
    created_at = NEW.created_at,
    updated_at = NEW.updated_at
  WHERE games.publisher_type = 'USER';
END;

CREATE TRIGGER trg_sandbox_games_after_update
AFTER UPDATE ON sandbox_games
FOR EACH ROW
BEGIN
  -- Authority Guard: Refuse update if matching games row has OWOGG authority
  SELECT RAISE(ABORT, 'Authority conflict: cannot update USER sandbox game corresponding to OWOGG identity')
  WHERE EXISTS (
    SELECT 1 FROM games
    WHERE id = OLD.id AND publisher_type = 'OWOGG'
  );

  -- Authority Guard: Refuse update if new slug is already claimed by a different OWOGG game
  SELECT RAISE(ABORT, 'Authority conflict: slug is reserved by OWOGG game')
  WHERE EXISTS (
    SELECT 1 FROM games
    WHERE slug = NEW.slug AND id <> OLD.id AND publisher_type = 'OWOGG'
  );

  -- Convergent upsert: if the USER generic row was somehow lost (deployment gap, manual repair,
  -- etc.) the trigger re-creates it with exact parity rather than silently doing nothing.
  -- ON CONFLICT(id) fires only when a row with that id already exists; the WHERE clause prevents
  -- accidentally overwriting an OWOGG row that somehow escaped the guard above (defense-in-depth).
  INSERT INTO games (
    id, slug, publisher_type, publisher_user_id, visibility, live_version_id, deleted_at, created_at, updated_at
  ) VALUES (
    OLD.id, NEW.slug, 'USER', NEW.developer_user_id, NEW.visibility, NEW.live_version_id, NEW.deleted_at, NEW.created_at, NEW.updated_at
  )
  ON CONFLICT(id) DO UPDATE SET
    slug = NEW.slug,
    publisher_type = 'USER',
    publisher_user_id = NEW.developer_user_id,
    visibility = NEW.visibility,
    live_version_id = NEW.live_version_id,
    deleted_at = NEW.deleted_at,
    created_at = NEW.created_at,
    updated_at = NEW.updated_at
  WHERE games.publisher_type = 'USER';
END;

CREATE TRIGGER trg_sandbox_games_after_delete
AFTER DELETE ON sandbox_games
FOR EACH ROW
BEGIN
  -- Authority Guard: Refuse delete if matching games row has OWOGG authority
  SELECT RAISE(ABORT, 'Authority conflict: cannot delete OWOGG identity via sandbox game delete')
  WHERE EXISTS (
    SELECT 1 FROM games
    WHERE id = OLD.id AND publisher_type = 'OWOGG'
  );

  DELETE FROM games
  WHERE id = OLD.id AND publisher_type = 'USER';
END;
