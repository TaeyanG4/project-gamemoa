-- Migration: 0004_account_merge.sql
-- Purpose: Store short-lived, single-use account-merge challenges bound to a primary candidate,
-- secondary candidate and a freshly authenticated second OAuth provider proof.

CREATE TABLE IF NOT EXISTS account_merge_challenges (
  id TEXT PRIMARY KEY,
  user_a INTEGER NOT NULL,
  user_b INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  consumed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_merge_challenge_pair ON account_merge_challenges(user_a, user_b);