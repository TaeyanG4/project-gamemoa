-- Migration: 0018_activity_streak.sql
-- Purpose: Foundation for a simple "consecutive active days" streak, surfaced on the new
-- public user profile page (/users/:id) as a lightweight gamification element. Tracked in
-- UTC calendar days. Updated lazily on session validation (see D1SessionRepository) rather
-- than via a separate cron/job — the first authenticated request of a new UTC day advances
-- or resets the streak; all other requests that day are no-ops.

ALTER TABLE users ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN longest_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_active_date TEXT;
