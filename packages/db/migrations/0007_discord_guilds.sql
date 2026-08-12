-- Additive migration: 0007_discord_guilds.sql
-- Discord server registration, manager authority, and candidate challenge tables

CREATE TABLE discord_guilds (
  guild_id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon_url TEXT,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'PUBLIC',
  registration_status TEXT NOT NULL DEFAULT 'ACTIVE',
  registered_by_user_id INTEGER NOT NULL,
  registered_at TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (registered_by_user_id) REFERENCES users(id)
);

CREATE TABLE discord_guild_managers (
  guild_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'MANAGER',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (guild_id, user_id),
  FOREIGN KEY (guild_id) REFERENCES discord_guilds(guild_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE discord_server_registration_challenges (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  manageable_guilds_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_discord_guilds_visibility_name ON discord_guilds(visibility, name);
CREATE UNIQUE INDEX idx_discord_guilds_slug ON discord_guilds(slug);
CREATE INDEX idx_discord_guild_managers_user ON discord_guild_managers(user_id);
