-- Migration: 0003_account_identity.sql
-- Purpose: Enforce that one GAMEMOA user cannot have two OAuth accounts for the same provider.
-- This strengthens the identity model so account linking keeps at most one provider identity per provider type.

CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_user_provider_unique ON oauth_accounts(user_id, provider);