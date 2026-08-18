-- Migration: 0028_game_attempt_consumptions.sql
-- Runtime-only replay protection for a Game Session's attemptId (packages/core/src/domain/
-- gameSession.ts, migration-free — the token itself is a self-verifying, stateless HMAC-signed
-- value, never stored). This table answers exactly one question, atomically: "has this specific
-- attemptId already been spent?" It is NOT canonical game/creator metadata (that's sandbox_games/
-- sandbox_game_versions, migration 0024) and NOT a score/leaderboard/XP record (scores,
-- xp_events) — only a one-time-use marker a future score-submission path will consult before
-- trusting a Game Session token a second time. See
-- packages/core/src/application/gameAttemptUseCases.ts for the read/write orchestration and
-- packages/db/src/d1/D1GameAttemptConsumptionRepository.ts for why a plain
-- `INSERT ... ON CONFLICT DO NOTHING` is the entire atomicity mechanism — no application-level
-- locking, no transaction wrapper, the PRIMARY KEY constraint below is what actually enforces
-- "at most once" under concurrent requests (same pattern as sandbox_games' review-slot claim,
-- migration 0024, and xp_events' per-source-event dedup).
CREATE TABLE game_attempt_consumptions (
  attempt_id TEXT PRIMARY KEY, -- the Game Session token's attemptId (crypto.randomUUID() at
                                -- issuance) — the natural, already-unique claim key; no surrogate
                                -- id column needed.
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES sandbox_games(id) ON DELETE CASCADE,
  version_id INTEGER NOT NULL REFERENCES sandbox_game_versions(id) ON DELETE CASCADE,
  consumed_at TEXT NOT NULL
);

-- Supports a future cleanup sweep of long-expired rows — a Game Session token (and therefore any
-- attemptId worth remembering) is only ever valid for a few minutes past issuance, so rows here
-- have no reason to accumulate indefinitely. No sweep exists yet; this index just keeps one ready
-- to add cheaply, matching sandbox_game_versions' idx_..._publish's same "not required by this
-- migration, ready for the next one" reasoning.
CREATE INDEX idx_game_attempt_consumptions_consumed_at ON game_attempt_consumptions(consumed_at);
