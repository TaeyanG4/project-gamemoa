-- Additive migration: 0009_discord_guild_xp_weekly_idx.sql
-- Phase H2: Weekly Guild XP indexing optimization

CREATE INDEX IF NOT EXISTS idx_discord_guild_xp_guild_created ON discord_guild_xp_events(guild_id, created_at);
