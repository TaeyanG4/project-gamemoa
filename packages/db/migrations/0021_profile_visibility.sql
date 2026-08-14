-- Migration: 0021_profile_visibility.sql
-- Purpose: Let each user decide whether their favorites and recent plays appear on their
-- PUBLIC profile (/users/:id). Both lists are already stored server-side in D1 for logged-in
-- users (user_favorites / user_recent_plays), so this is purely about disclosure, not storage.
--
-- Default is 0 (private) rather than 1: these two lists were never publicly visible before this
-- migration, so defaulting them to public would retroactively disclose existing users' data
-- without their consent. Users opt in from /settings.

ALTER TABLE users ADD COLUMN show_favorites INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN show_recent_plays INTEGER NOT NULL DEFAULT 0;
