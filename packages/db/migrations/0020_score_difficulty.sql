-- Migration: 0020_score_difficulty.sql
-- Purpose: Per-score difficulty tier (normal/hard/...), foundation for task #40. Scores across
-- difficulty tiers are never directly comparable (a smaller-target "hard" aim-test time isn't
-- the same measurement as "normal"), so the leaderboard must partition by (game_id, difficulty)
-- rather than just game_id. Default 'normal' backfills every existing row and is also the value
-- every game WITHOUT a manifest `difficulty` config always writes — see
-- packages/core/src/domain/scoreValidation.ts's validateDifficulty.

ALTER TABLE scores ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS idx_scores_game_difficulty_score ON scores(game_id, difficulty, score);
