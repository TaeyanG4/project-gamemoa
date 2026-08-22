-- Migration: 0034_unified_game_control_plane.sql
-- Unified Game Platform — expand/switch phase.
--
-- `games` and `game_versions` become the authoritative control-plane rows for USER games as
-- well as OWOGG games. The two sandbox tables remain only as deployment-gap compatibility
-- mirrors for the previous Worker revision; a later contract migration may remove them after the
-- generic-only Worker has been proven in Staging. Applying this migration before deploying the
-- new Worker is safe because legacy writes still converge into the expanded generic rows.

ALTER TABLE games ADD COLUMN title TEXT;
ALTER TABLE games ADD COLUMN short_description TEXT;
ALTER TABLE games ADD COLUMN description TEXT;
ALTER TABLE games ADD COLUMN genre TEXT;
ALTER TABLE games ADD COLUMN mode TEXT;
ALTER TABLE games ADD COLUMN xp_per_completion INTEGER;
ALTER TABLE games ADD COLUMN score_unit TEXT;
ALTER TABLE games ADD COLUMN score_direction TEXT;
ALTER TABLE games ADD COLUMN score_min REAL;
ALTER TABLE games ADD COLUMN score_max REAL;
ALTER TABLE games ADD COLUMN score_display_prefix TEXT;
ALTER TABLE games ADD COLUMN score_display_suffix TEXT;
ALTER TABLE games ADD COLUMN review_slot INTEGER;
ALTER TABLE games ADD COLUMN deleted_by_admin_id INTEGER;

ALTER TABLE game_versions ADD COLUMN moderation_status TEXT;
ALTER TABLE game_versions ADD COLUMN reviewed_by_admin_id INTEGER;
ALTER TABLE game_versions ADD COLUMN reviewed_at TEXT;
ALTER TABLE game_versions ADD COLUMN reject_reason TEXT;

UPDATE games
SET
  title = (SELECT sg.title FROM sandbox_games sg WHERE sg.id = games.id),
  short_description = (SELECT sg.short_description FROM sandbox_games sg WHERE sg.id = games.id),
  description = (SELECT sg.description FROM sandbox_games sg WHERE sg.id = games.id),
  genre = (SELECT sg.genre FROM sandbox_games sg WHERE sg.id = games.id),
  mode = (SELECT sg.mode FROM sandbox_games sg WHERE sg.id = games.id),
  xp_per_completion = (SELECT sg.xp_per_completion FROM sandbox_games sg WHERE sg.id = games.id),
  score_unit = (SELECT sg.score_unit FROM sandbox_games sg WHERE sg.id = games.id),
  score_direction = (SELECT sg.score_direction FROM sandbox_games sg WHERE sg.id = games.id),
  score_min = (SELECT sg.score_min FROM sandbox_games sg WHERE sg.id = games.id),
  score_max = (SELECT sg.score_max FROM sandbox_games sg WHERE sg.id = games.id),
  score_display_prefix = (SELECT sg.score_display_prefix FROM sandbox_games sg WHERE sg.id = games.id),
  score_display_suffix = (SELECT sg.score_display_suffix FROM sandbox_games sg WHERE sg.id = games.id),
  review_slot = (SELECT sg.review_slot FROM sandbox_games sg WHERE sg.id = games.id),
  deleted_by_admin_id = (SELECT sg.deleted_by_admin_id FROM sandbox_games sg WHERE sg.id = games.id)
WHERE publisher_type = 'USER';

UPDATE game_versions
SET
  moderation_status = (SELECT sv.status FROM sandbox_game_versions sv WHERE sv.id = game_versions.id),
  reviewed_by_admin_id = (SELECT sv.reviewed_by_admin_id FROM sandbox_game_versions sv WHERE sv.id = game_versions.id),
  reviewed_at = (SELECT sv.reviewed_at FROM sandbox_game_versions sv WHERE sv.id = game_versions.id),
  reject_reason = (SELECT sv.reject_reason FROM sandbox_game_versions sv WHERE sv.id = game_versions.id)
WHERE EXISTS (SELECT 1 FROM sandbox_game_versions sv WHERE sv.id = game_versions.id);

CREATE UNIQUE INDEX idx_games_user_review_slot
  ON games(publisher_user_id, review_slot)
  WHERE publisher_user_id IS NOT NULL AND review_slot IS NOT NULL;
CREATE INDEX idx_game_versions_moderation
  ON game_versions(moderation_status, uploaded_at)
  WHERE moderation_status IS NOT NULL;

-- Abort unless the expanded authority exactly contains every legacy USER workflow field.
CREATE TABLE _migration_0034_control_plane_guard (
  must_be_zero INTEGER CHECK (must_be_zero = 0)
);

INSERT INTO _migration_0034_control_plane_guard (must_be_zero)
SELECT COUNT(*)
FROM sandbox_games sg
LEFT JOIN games g ON g.id = sg.id
WHERE g.id IS NULL
   OR g.publisher_type <> 'USER'
   OR g.publisher_user_id IS NOT sg.developer_user_id
   OR g.slug <> sg.slug
   OR g.title IS NOT sg.title
   OR g.short_description IS NOT sg.short_description
   OR g.description IS NOT sg.description
   OR g.genre IS NOT sg.genre
   OR g.mode IS NOT sg.mode
   OR g.xp_per_completion IS NOT sg.xp_per_completion
   OR g.score_unit IS NOT sg.score_unit
   OR g.score_direction IS NOT sg.score_direction
   OR g.score_min IS NOT sg.score_min
   OR g.score_max IS NOT sg.score_max
   OR g.score_display_prefix IS NOT sg.score_display_prefix
   OR g.score_display_suffix IS NOT sg.score_display_suffix
   OR g.visibility <> sg.visibility
   OR g.live_version_id IS NOT sg.live_version_id
   OR g.review_slot IS NOT sg.review_slot
   OR g.deleted_at IS NOT sg.deleted_at
   OR g.deleted_by_admin_id IS NOT sg.deleted_by_admin_id
   OR g.created_at <> sg.created_at
   OR g.updated_at <> sg.updated_at;

INSERT INTO _migration_0034_control_plane_guard (must_be_zero)
SELECT COUNT(*)
FROM sandbox_game_versions sv
LEFT JOIN game_versions gv ON gv.id = sv.id
WHERE gv.id IS NULL
   OR gv.game_id <> sv.game_id
   OR gv.moderation_status IS NOT sv.status
   OR gv.reviewed_by_admin_id IS NOT sv.reviewed_by_admin_id
   OR gv.reviewed_at IS NOT sv.reviewed_at
   OR gv.reject_reason IS NOT sv.reject_reason;

DROP TABLE _migration_0034_control_plane_guard;

-- Replace the old legacy-to-generic convergence triggers so an old Worker running during the
-- migration/deploy gap also fills the newly authoritative fields.
DROP TRIGGER trg_sandbox_games_after_insert;
DROP TRIGGER trg_sandbox_games_after_update;

CREATE TRIGGER trg_sandbox_games_after_insert
AFTER INSERT ON sandbox_games
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Authority conflict: cannot insert USER game on top of OWOGG identity')
  WHERE EXISTS (SELECT 1 FROM games WHERE id = NEW.id AND publisher_type = 'OWOGG');

  INSERT INTO games (
    id, slug, publisher_type, publisher_user_id, visibility, live_version_id, deleted_at,
    created_at, updated_at, title, short_description, description, genre, mode,
    xp_per_completion, score_unit, score_direction, score_min, score_max,
    score_display_prefix, score_display_suffix, review_slot, deleted_by_admin_id
  ) VALUES (
    NEW.id, NEW.slug, 'USER', NEW.developer_user_id, NEW.visibility, NEW.live_version_id,
    NEW.deleted_at, NEW.created_at, NEW.updated_at, NEW.title, NEW.short_description,
    NEW.description, NEW.genre, NEW.mode, NEW.xp_per_completion, NEW.score_unit,
    NEW.score_direction, NEW.score_min, NEW.score_max, NEW.score_display_prefix,
    NEW.score_display_suffix, NEW.review_slot, NEW.deleted_by_admin_id
  )
  ON CONFLICT(id) DO UPDATE SET
    slug = NEW.slug, publisher_type = 'USER', publisher_user_id = NEW.developer_user_id,
    visibility = NEW.visibility, live_version_id = NEW.live_version_id,
    deleted_at = NEW.deleted_at, created_at = NEW.created_at, updated_at = NEW.updated_at,
    title = NEW.title, short_description = NEW.short_description,
    description = NEW.description, genre = NEW.genre, mode = NEW.mode,
    xp_per_completion = NEW.xp_per_completion, score_unit = NEW.score_unit,
    score_direction = NEW.score_direction, score_min = NEW.score_min, score_max = NEW.score_max,
    score_display_prefix = NEW.score_display_prefix, score_display_suffix = NEW.score_display_suffix,
    review_slot = NEW.review_slot, deleted_by_admin_id = NEW.deleted_by_admin_id
  WHERE games.publisher_type = 'USER';
END;

CREATE TRIGGER trg_sandbox_games_after_update
AFTER UPDATE ON sandbox_games
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Authority conflict: cannot update USER game on top of OWOGG identity')
  WHERE EXISTS (SELECT 1 FROM games WHERE id = OLD.id AND publisher_type = 'OWOGG');

  INSERT INTO games (
    id, slug, publisher_type, publisher_user_id, visibility, live_version_id, deleted_at,
    created_at, updated_at, title, short_description, description, genre, mode,
    xp_per_completion, score_unit, score_direction, score_min, score_max,
    score_display_prefix, score_display_suffix, review_slot, deleted_by_admin_id
  ) VALUES (
    OLD.id, NEW.slug, 'USER', NEW.developer_user_id, NEW.visibility, NEW.live_version_id,
    NEW.deleted_at, NEW.created_at, NEW.updated_at, NEW.title, NEW.short_description,
    NEW.description, NEW.genre, NEW.mode, NEW.xp_per_completion, NEW.score_unit,
    NEW.score_direction, NEW.score_min, NEW.score_max, NEW.score_display_prefix,
    NEW.score_display_suffix, NEW.review_slot, NEW.deleted_by_admin_id
  )
  ON CONFLICT(id) DO UPDATE SET
    slug = NEW.slug, publisher_type = 'USER', publisher_user_id = NEW.developer_user_id,
    visibility = NEW.visibility, live_version_id = NEW.live_version_id,
    deleted_at = NEW.deleted_at, created_at = NEW.created_at, updated_at = NEW.updated_at,
    title = NEW.title, short_description = NEW.short_description,
    description = NEW.description, genre = NEW.genre, mode = NEW.mode,
    xp_per_completion = NEW.xp_per_completion, score_unit = NEW.score_unit,
    score_direction = NEW.score_direction, score_min = NEW.score_min, score_max = NEW.score_max,
    score_display_prefix = NEW.score_display_prefix, score_display_suffix = NEW.score_display_suffix,
    review_slot = NEW.review_slot, deleted_by_admin_id = NEW.deleted_by_admin_id
  WHERE games.publisher_type = 'USER';
END;

DROP TRIGGER trg_sandbox_game_versions_after_insert;
DROP TRIGGER trg_sandbox_game_versions_after_update;

CREATE TRIGGER trg_sandbox_game_versions_after_insert
AFTER INSERT ON sandbox_game_versions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Authority conflict: sandbox version game must be a USER game identity')
  WHERE NOT EXISTS (SELECT 1 FROM games WHERE id = NEW.game_id AND publisher_type = 'USER');

  INSERT INTO game_versions (
    id, game_id, object_key, content_hash, bundle_bytes, publish_status, publish_error,
    published_at, manifest_key, published_size_bytes, file_count, uploaded_at,
    moderation_status, reviewed_by_admin_id, reviewed_at, reject_reason
  ) VALUES (
    NEW.id, NEW.game_id, NEW.object_key, NEW.content_hash, NEW.bundle_bytes, NEW.publish_status,
    NEW.publish_error, NEW.published_at, NEW.manifest_key, NEW.published_size_bytes,
    NEW.file_count, NEW.uploaded_at, NEW.status, NEW.reviewed_by_admin_id,
    NEW.reviewed_at, NEW.reject_reason
  )
  ON CONFLICT(id) DO UPDATE SET
    game_id = NEW.game_id, object_key = NEW.object_key, content_hash = NEW.content_hash,
    bundle_bytes = NEW.bundle_bytes, publish_status = NEW.publish_status,
    publish_error = NEW.publish_error, published_at = NEW.published_at,
    manifest_key = NEW.manifest_key, published_size_bytes = NEW.published_size_bytes,
    file_count = NEW.file_count, uploaded_at = NEW.uploaded_at,
    moderation_status = NEW.status, reviewed_by_admin_id = NEW.reviewed_by_admin_id,
    reviewed_at = NEW.reviewed_at, reject_reason = NEW.reject_reason
  WHERE game_versions.game_id = NEW.game_id;
END;

CREATE TRIGGER trg_sandbox_game_versions_after_update
AFTER UPDATE ON sandbox_game_versions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Authority conflict: sandbox version game must be a USER game identity')
  WHERE NOT EXISTS (SELECT 1 FROM games WHERE id = NEW.game_id AND publisher_type = 'USER');

  UPDATE game_versions SET
    game_id = NEW.game_id, object_key = NEW.object_key, content_hash = NEW.content_hash,
    bundle_bytes = NEW.bundle_bytes, publish_status = NEW.publish_status,
    publish_error = NEW.publish_error, published_at = NEW.published_at,
    manifest_key = NEW.manifest_key, published_size_bytes = NEW.published_size_bytes,
    file_count = NEW.file_count, uploaded_at = NEW.uploaded_at,
    moderation_status = NEW.status, reviewed_by_admin_id = NEW.reviewed_by_admin_id,
    reviewed_at = NEW.reviewed_at, reject_reason = NEW.reject_reason
  WHERE id = OLD.id AND game_id = NEW.game_id;
END;
