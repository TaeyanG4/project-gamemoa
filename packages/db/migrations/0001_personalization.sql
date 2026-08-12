-- Cloudflare D1 Migration for Personalization (User Favorites & Recent Plays)

CREATE TABLE IF NOT EXISTS user_favorites (
  user_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, game_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_recent_plays (
  user_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  last_played_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, game_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recent_plays_user_played ON user_recent_plays(user_id, last_played_at DESC);
