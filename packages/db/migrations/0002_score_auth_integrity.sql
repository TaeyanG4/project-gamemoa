-- Migration: 0002_score_auth_integrity.sql
-- Purpose: Remove legacy unauthenticated guest scores and prevent non-null user_id violations

-- 1. Remove legacy guest leaderboard rows
DELETE FROM scores WHERE user_id IS NULL;

-- 2. Optional SQLite trigger defense in depth to abort future inserts missing user_id
CREATE TRIGGER IF NOT EXISTS enforce_score_user_id_not_null
BEFORE INSERT ON scores
FOR EACH ROW
WHEN NEW.user_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'user_id cannot be null');
END;
