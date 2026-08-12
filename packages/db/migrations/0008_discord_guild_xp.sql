-- Additive migration: 0008_discord_guild_xp.sql
-- Phase H1: Discord Guild XP Attribution Foundation and Play Contexts
-- Critical Database Invariant: ONE global xp_event -> AT MOST ONE Discord guild attribution (UNIQUE source_xp_event_id)

CREATE TABLE discord_play_contexts (
  token_hash TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  discord_user_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  game_id TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  FOREIGN KEY (guild_id) REFERENCES discord_guilds(guild_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE discord_guild_xp_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  source_xp_event_id INTEGER NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (guild_id) REFERENCES discord_guilds(guild_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (source_xp_event_id) REFERENCES xp_events(id) ON DELETE CASCADE
);

CREATE INDEX idx_discord_play_contexts_user ON discord_play_contexts(user_id);
CREATE INDEX idx_discord_guild_xp_guild_user ON discord_guild_xp_events(guild_id, user_id);
CREATE INDEX idx_discord_guild_xp_guild ON discord_guild_xp_events(guild_id);
