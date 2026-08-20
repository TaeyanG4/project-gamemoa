-- Migration: 0033_generic_game_assets.sql
-- C-3 — provider-neutral game-level media metadata. Bytes remain at the existing B2 key; this
-- table only ties an asset to the generic numeric game identity.

CREATE TABLE game_assets (
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  object_key TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (game_id, kind),
  CHECK (kind IN ('LOGO')),
  CHECK (length(object_key) > 0),
  CHECK (length(updated_at) > 0)
);

-- Fail closed if the legacy USER logo source cannot be tied to the exact generic USER identity.
-- This is a normal table rather than TEMP because Cloudflare D1 rejects TEMP DDL remotely.
CREATE TABLE _migration_0033_asset_guard (
  must_be_zero INTEGER CHECK (must_be_zero = 0)
);

INSERT INTO _migration_0033_asset_guard (must_be_zero)
SELECT COUNT(*)
FROM sandbox_games sg
LEFT JOIN games g ON g.id = sg.id
WHERE sg.logo_key IS NOT NULL
  AND (
    g.id IS NULL
    OR g.publisher_type <> 'USER'
    OR g.publisher_user_id IS NOT sg.developer_user_id
  );

-- Exact, non-destructive USER logo backfill. The source remains sandbox_games until the old
-- Worker deployment gap has closed; no B2 object is copied or renamed.
INSERT INTO game_assets (game_id, kind, object_key, updated_at)
SELECT sg.id, 'LOGO', sg.logo_key, sg.updated_at
FROM sandbox_games sg
WHERE sg.logo_key IS NOT NULL;

DROP TABLE _migration_0033_asset_guard;

-- Old Workers continue to write sandbox_games.logo_key. These triggers make that write converge
-- atomically into the generic asset metadata without exposing the storage key publicly. A conflict
-- with a different object is ambiguous authority and aborts the legacy write rather than silently
-- overwriting a generic asset.
CREATE TRIGGER trg_sandbox_games_logo_asset_after_insert
AFTER INSERT ON sandbox_games
FOR EACH ROW
WHEN NEW.logo_key IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Game asset conflict: logo object differs')
  WHERE EXISTS (
    SELECT 1
    FROM games g
    JOIN game_assets a ON a.game_id = g.id AND a.kind = 'LOGO'
    WHERE g.id = NEW.id AND g.publisher_type = 'USER' AND a.object_key <> NEW.logo_key
  );

  INSERT INTO game_assets (game_id, kind, object_key, updated_at)
  SELECT NEW.id, 'LOGO', NEW.logo_key, NEW.updated_at
  WHERE EXISTS (
    SELECT 1
    FROM games
    WHERE id = NEW.id
      AND publisher_type = 'USER'
      AND publisher_user_id = NEW.developer_user_id
  )
  ON CONFLICT(game_id, kind) DO UPDATE SET
    object_key = NEW.logo_key,
    updated_at = NEW.updated_at;
END;

CREATE TRIGGER trg_sandbox_games_logo_asset_after_update
AFTER UPDATE OF logo_key ON sandbox_games
FOR EACH ROW
WHEN NEW.logo_key IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Game asset conflict: logo object differs')
  WHERE EXISTS (
    SELECT 1
    FROM games g
    JOIN game_assets a ON a.game_id = g.id AND a.kind = 'LOGO'
    WHERE g.id = NEW.id AND g.publisher_type = 'USER' AND a.object_key <> NEW.logo_key
  );

  INSERT INTO game_assets (game_id, kind, object_key, updated_at)
  SELECT NEW.id, 'LOGO', NEW.logo_key, NEW.updated_at
  WHERE EXISTS (
    SELECT 1
    FROM games
    WHERE id = NEW.id
      AND publisher_type = 'USER'
      AND publisher_user_id = NEW.developer_user_id
  )
  ON CONFLICT(game_id, kind) DO UPDATE SET
    object_key = NEW.logo_key,
    updated_at = NEW.updated_at;
END;

-- The identity convergence trigger from 0030 may create `games` as a nested operation of a
-- legacy `sandbox_games` INSERT. SQLite does not promise creation-order execution for sibling
-- triggers, so also converge when the generic USER identity itself appears. This closes that
-- deployment-gap ordering without allowing a sandbox row to create or overwrite authority.
CREATE TRIGGER trg_games_user_logo_asset_after_insert
AFTER INSERT ON games
FOR EACH ROW
WHEN NEW.publisher_type = 'USER'
  AND EXISTS (
    SELECT 1
    FROM sandbox_games sg
    WHERE sg.id = NEW.id
      AND sg.logo_key IS NOT NULL
      AND sg.developer_user_id = NEW.publisher_user_id
  )
BEGIN
  SELECT RAISE(ABORT, 'Game asset conflict: logo object differs')
  WHERE EXISTS (
    SELECT 1 FROM game_assets
    WHERE game_id = NEW.id AND kind = 'LOGO'
      AND object_key <> (SELECT logo_key FROM sandbox_games WHERE id = NEW.id)
  );

  INSERT INTO game_assets (game_id, kind, object_key, updated_at)
  SELECT NEW.id, 'LOGO', sg.logo_key, sg.updated_at
  FROM sandbox_games sg
  WHERE sg.id = NEW.id AND sg.logo_key IS NOT NULL
  ON CONFLICT(game_id, kind) DO UPDATE SET
    object_key = excluded.object_key,
    updated_at = excluded.updated_at;
END;

CREATE TRIGGER trg_sandbox_games_logo_asset_after_clear
AFTER UPDATE OF logo_key ON sandbox_games
FOR EACH ROW
WHEN NEW.logo_key IS NULL
BEGIN
  DELETE FROM game_assets WHERE game_id = NEW.id AND kind = 'LOGO';
END;
