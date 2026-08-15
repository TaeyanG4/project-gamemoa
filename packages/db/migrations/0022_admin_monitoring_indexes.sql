-- Additive migration: 0022_admin_monitoring_indexes.sql
-- Supports /admin/monitoring's DAU/WAU and per-game play-count queries. Neither xp_events nor
-- scores previously had an index with created_at as the leading column (existing indexes are
-- user_id/game_id-led), so a "how many rows since <timestamp>, across all users" query would
-- have been a full table scan.

CREATE INDEX IF NOT EXISTS idx_xp_events_created ON xp_events(created_at);
CREATE INDEX IF NOT EXISTS idx_scores_created ON scores(created_at);
