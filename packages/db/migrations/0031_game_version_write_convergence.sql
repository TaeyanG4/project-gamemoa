-- Migration: 0031_game_version_write_convergence.sql
-- Unified Game Platform, Stage A-4 — generic GameVersion storage and USER write convergence.
--
-- `game_versions` stores only provider-neutral bundle identity and publish facts. USER review
-- fields remain authoritative in `sandbox_game_versions`. Existing USER numeric version IDs are
-- preserved exactly so games.live_version_id already points into the generic namespace.

CREATE TABLE game_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  bundle_bytes INTEGER NOT NULL,
  publish_status TEXT NOT NULL,
  publish_error TEXT,
  published_at TEXT,
  manifest_key TEXT,
  published_size_bytes INTEGER,
  file_count INTEGER,
  uploaded_at TEXT NOT NULL,
  CHECK (length(object_key) > 0),
  CHECK (length(content_hash) > 0),
  CHECK (bundle_bytes >= 0),
  CHECK (publish_status IN ('UPLOADED', 'PUBLISHING', 'READY', 'FAILED')),
  CHECK (published_size_bytes IS NULL OR published_size_bytes >= 0),
  CHECK (file_count IS NULL OR file_count >= 0),
  CHECK (length(uploaded_at) > 0)
);

CREATE INDEX idx_game_versions_game ON game_versions(game_id, uploaded_at DESC, id DESC);
CREATE INDEX idx_game_versions_publish ON game_versions(publish_status, uploaded_at);

-- Initial USER backfill. A-3 guarantees every sandbox_games row has the same USER identity in
-- games; joining through games makes an authority mismatch visible instead of inventing identity.
INSERT INTO game_versions (
  id,
  game_id,
  object_key,
  content_hash,
  bundle_bytes,
  publish_status,
  publish_error,
  published_at,
  manifest_key,
  published_size_bytes,
  file_count,
  uploaded_at
)
SELECT
  sv.id,
  sv.game_id,
  sv.object_key,
  sv.content_hash,
  sv.bundle_bytes,
  sv.publish_status,
  sv.publish_error,
  sv.published_at,
  sv.manifest_key,
  sv.published_size_bytes,
  sv.file_count,
  sv.uploaded_at
FROM sandbox_game_versions sv
JOIN games g ON g.id = sv.game_id AND g.publisher_type = 'USER';

-- Fail closed unless every legacy USER version has exact provider-neutral parity and every live
-- version pointer resolves to a version owned by that same game.
CREATE TEMP TABLE _migration_0031_parity_guard (
  must_be_zero INTEGER CHECK (must_be_zero = 0)
);

INSERT INTO _migration_0031_parity_guard (must_be_zero)
SELECT COUNT(*)
FROM sandbox_game_versions sv
LEFT JOIN games g ON g.id = sv.game_id
LEFT JOIN game_versions gv ON gv.id = sv.id
WHERE g.id IS NULL
   OR g.publisher_type <> 'USER'
   OR gv.id IS NULL
   OR gv.game_id <> sv.game_id
   OR gv.object_key <> sv.object_key
   OR gv.content_hash <> sv.content_hash
   OR gv.bundle_bytes <> sv.bundle_bytes
   OR gv.publish_status <> sv.publish_status
   OR gv.publish_error IS NOT sv.publish_error
   OR gv.published_at IS NOT sv.published_at
   OR gv.manifest_key IS NOT sv.manifest_key
   OR gv.published_size_bytes IS NOT sv.published_size_bytes
   OR gv.file_count IS NOT sv.file_count
   OR gv.uploaded_at <> sv.uploaded_at;

INSERT INTO _migration_0031_parity_guard (must_be_zero)
SELECT COUNT(*)
FROM games g
WHERE g.live_version_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM game_versions gv
    WHERE gv.id = g.live_version_id AND gv.game_id = g.id
  );

DROP TABLE _migration_0031_parity_guard;

-- Close the D1-migration -> Worker-deploy gap. Old Workers continue writing the USER workflow
-- table; these triggers converge provider-neutral fields without copying review state.
CREATE TRIGGER trg_sandbox_game_versions_after_insert
AFTER INSERT ON sandbox_game_versions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Authority conflict: sandbox version game must be a USER game identity')
  WHERE NOT EXISTS (
    SELECT 1 FROM games WHERE id = NEW.game_id AND publisher_type = 'USER'
  );

  SELECT RAISE(ABORT, 'Version identity conflict: generic version id already has different data')
  WHERE EXISTS (
    SELECT 1 FROM game_versions gv
    WHERE gv.id = NEW.id
      AND (
        gv.game_id <> NEW.game_id
        OR gv.object_key <> NEW.object_key
        OR gv.content_hash <> NEW.content_hash
        OR gv.bundle_bytes <> NEW.bundle_bytes
        OR gv.publish_status <> NEW.publish_status
        OR gv.publish_error IS NOT NEW.publish_error
        OR gv.published_at IS NOT NEW.published_at
        OR gv.manifest_key IS NOT NEW.manifest_key
        OR gv.published_size_bytes IS NOT NEW.published_size_bytes
        OR gv.file_count IS NOT NEW.file_count
        OR gv.uploaded_at <> NEW.uploaded_at
      )
  );

  INSERT INTO game_versions (
    id, game_id, object_key, content_hash, bundle_bytes, publish_status, publish_error,
    published_at, manifest_key, published_size_bytes, file_count, uploaded_at
  ) VALUES (
    NEW.id, NEW.game_id, NEW.object_key, NEW.content_hash, NEW.bundle_bytes, NEW.publish_status,
    NEW.publish_error, NEW.published_at, NEW.manifest_key, NEW.published_size_bytes,
    NEW.file_count, NEW.uploaded_at
  )
  ON CONFLICT(id) DO NOTHING;
END;

CREATE TRIGGER trg_sandbox_game_versions_after_update
AFTER UPDATE ON sandbox_game_versions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Authority conflict: sandbox version game must be a USER game identity')
  WHERE NOT EXISTS (
    SELECT 1 FROM games WHERE id = NEW.game_id AND publisher_type = 'USER'
  );

  SELECT RAISE(ABORT, 'Version identity conflict: cannot move USER version onto another generic version')
  WHERE EXISTS (
    SELECT 1 FROM game_versions gv WHERE gv.id = OLD.id AND gv.game_id <> NEW.game_id
  );

  INSERT INTO game_versions (
    id, game_id, object_key, content_hash, bundle_bytes, publish_status, publish_error,
    published_at, manifest_key, published_size_bytes, file_count, uploaded_at
  ) VALUES (
    OLD.id, NEW.game_id, NEW.object_key, NEW.content_hash, NEW.bundle_bytes, NEW.publish_status,
    NEW.publish_error, NEW.published_at, NEW.manifest_key, NEW.published_size_bytes,
    NEW.file_count, NEW.uploaded_at
  )
  ON CONFLICT(id) DO UPDATE SET
    game_id = NEW.game_id,
    object_key = NEW.object_key,
    content_hash = NEW.content_hash,
    bundle_bytes = NEW.bundle_bytes,
    publish_status = NEW.publish_status,
    publish_error = NEW.publish_error,
    published_at = NEW.published_at,
    manifest_key = NEW.manifest_key,
    published_size_bytes = NEW.published_size_bytes,
    file_count = NEW.file_count,
    uploaded_at = NEW.uploaded_at
  WHERE game_versions.game_id = NEW.game_id;
END;

CREATE TRIGGER trg_sandbox_game_versions_after_delete
AFTER DELETE ON sandbox_game_versions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Version identity conflict: cannot delete a different generic version')
  WHERE EXISTS (
    SELECT 1 FROM game_versions gv WHERE gv.id = OLD.id AND gv.game_id <> OLD.game_id
  );

  DELETE FROM game_versions WHERE id = OLD.id AND game_id = OLD.game_id;
END;

-- Runtime identity can only point at a generic version belonging to that exact game. This guard is
-- D1-local and remains effective even when B2 canonical/bundle storage is unavailable.
CREATE TRIGGER trg_games_live_version_before_insert
BEFORE INSERT ON games
FOR EACH ROW
WHEN NEW.live_version_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Invalid live version: version must belong to the same game')
  WHERE NOT EXISTS (
    SELECT 1 FROM game_versions gv
    WHERE gv.id = NEW.live_version_id AND gv.game_id = NEW.id
  );
END;

CREATE TRIGGER trg_games_live_version_before_update
BEFORE UPDATE OF live_version_id, id ON games
FOR EACH ROW
WHEN NEW.live_version_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Invalid live version: version must belong to the same game')
  WHERE NOT EXISTS (
    SELECT 1 FROM game_versions gv
    WHERE gv.id = NEW.live_version_id AND gv.game_id = NEW.id
  );
END;
