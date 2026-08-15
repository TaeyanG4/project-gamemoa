-- Migration 0010: Creator Model Foundation
-- Additive migration for optional Creator profile and platform accounts linked to OwOGG users.

CREATE TABLE IF NOT EXISTS creator_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'UNVERIFIED', -- 'UNVERIFIED', 'VERIFIED', 'SUSPENDED'
  featured_status TEXT NOT NULL DEFAULT 'NONE', -- 'NONE', 'FEATURED', 'PARTNER'
  featured_reason TEXT,
  featured_since TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS creator_platform_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'YOUTUBE', 'CHZZK', 'SOOP', 'TWITCH'
  platform_user_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_handle TEXT,
  channel_url TEXT NOT NULL,
  avatar_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED', -- 'UNVERIFIED', 'VERIFIED', 'REJECTED'
  verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(platform, platform_user_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_user ON creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_status ON creator_profiles(status);
CREATE INDEX IF NOT EXISTS idx_creator_platform_accounts_creator ON creator_platform_accounts(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_platform_accounts_platform ON creator_platform_accounts(platform, verification_status);
