-- Migration: 0005_progression.sql
-- Purpose: Foundation for GAMEMOA progression (XP/Level/Achievements) and centralized
-- nickname/country-region profile policy. Additive only; does not touch prior migrations.

-- Profile metadata: GAMEMOA nickname is independent from OAuth display name and has its
-- own cooldown. Country/region is self-reported ISO 3166-1 alpha-2 metadata, not verified
-- nationality, and has its own (longer) cooldown.
ALTER TABLE users ADD COLUMN country TEXT;
ALTER TABLE users ADD COLUMN nickname_updated_at TEXT;
ALTER TABLE users ADD COLUMN country_updated_at TEXT;

-- Server-authoritative, auditable XP ledger. One accepted game-completion source event
-- (identified by source_type + source_id, e.g. a specific `scores` row id) produces at
-- most one ledger row — this is the idempotency guarantee that prevents duplicate XP on
-- replay. `amount` is 0 when the per-user/per-game/per-UTC-day XP cap has already been
-- reached, so completion counting (eligible_completions) still advances for achievement
-- purposes without granting further XP that day.
CREATE TABLE IF NOT EXISTS xp_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  game_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_created ON xp_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_xp_events_user_game_created ON xp_events(user_id, game_id, created_at);

-- Denormalized aggregate for fast dashboard/leaderboard reads. Always derived from and
-- kept consistent with xp_events; never the source of truth by itself.
CREATE TABLE IF NOT EXISTS user_progress (
  user_id INTEGER PRIMARY KEY,
  total_xp INTEGER NOT NULL DEFAULT 0,
  eligible_completions INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_progress_total_xp ON user_progress(total_xp DESC);

-- Achievement unlocks. Idempotent by construction via the UNIQUE constraint; achievements
-- do not grant XP (avoids a progression feedback loop).
CREATE TABLE IF NOT EXISTS user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_code TEXT NOT NULL,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, achievement_code)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
