-- Migration 0011: Creator Platform Metrics & Ownership Additions
-- Additive columns to store verified platform metrics and prepare for Phase E2.

ALTER TABLE creator_platform_accounts ADD COLUMN audience_count INTEGER DEFAULT 0;
ALTER TABLE creator_platform_accounts ADD COLUMN channel_created_at TEXT;
ALTER TABLE creator_platform_accounts ADD COLUMN metrics_synced_at TEXT;
