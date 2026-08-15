-- Migration: 0006_discord_link.sql
-- Purpose: Discord HTTP Interactions account-linking challenges (/owogg link).
--
-- A Discord bot slash-command interaction cryptographically proves the invoking Discord
-- user's ID (via Discord's own Ed25519-signed request), but that alone is not proof that
-- the same person controls a specific OwOGG account. We issue a short-lived, single-use,
-- opaque token bound to the Discord identity; the OwOGG website only accepts the token
-- (never a raw discord_user_id query parameter) to complete the link.

CREATE TABLE IF NOT EXISTS discord_link_challenges (
  token_hash TEXT PRIMARY KEY,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_discord_link_challenges_discord_user
  ON discord_link_challenges(discord_user_id);
