-- Migration: 0032_generic_score_acceptance.sql
-- Stage C-2 — make one-use score acceptance provider-neutral. Existing attempt rows are preserved
-- and must resolve to the exact generic identity/version pair before the table is rebuilt.

CREATE TABLE _migration_0032_attempt_guard (
  must_be_zero INTEGER CHECK (must_be_zero = 0)
);

INSERT INTO _migration_0032_attempt_guard (must_be_zero)
SELECT COUNT(*)
FROM game_attempt_consumptions ac
LEFT JOIN games g ON g.id = ac.game_id
LEFT JOIN game_versions gv ON gv.id = ac.version_id
WHERE g.id IS NULL
   OR gv.id IS NULL
   OR gv.game_id <> ac.game_id;

DROP TABLE _migration_0032_attempt_guard;

CREATE TABLE game_attempt_consumptions_v2 (
  attempt_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  version_id INTEGER NOT NULL REFERENCES game_versions(id) ON DELETE CASCADE,
  consumed_at TEXT NOT NULL
);

INSERT INTO game_attempt_consumptions_v2 (attempt_id, user_id, game_id, version_id, consumed_at)
SELECT attempt_id, user_id, game_id, version_id, consumed_at
FROM game_attempt_consumptions;

DROP TABLE game_attempt_consumptions;
ALTER TABLE game_attempt_consumptions_v2 RENAME TO game_attempt_consumptions;

CREATE INDEX idx_game_attempt_consumptions_consumed_at
  ON game_attempt_consumptions(consumed_at);
