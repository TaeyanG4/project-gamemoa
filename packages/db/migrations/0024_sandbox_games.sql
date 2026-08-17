-- Migration: 0024_sandbox_games.sql
-- External-developer game uploads (sandbox), V1 = invite-only (2026-08-15 design, see
-- docs/GAME_CREATION_GUIDE.md §3). A developer uploads an arbitrary static web bundle (Unity
-- WebGL / Godot HTML5 / Phaser / plain JS — anything with an index.html entry point); the bundle
-- itself is stored in object storage (Backblaze B2, see §3.2 — a deliberate 2026-08-16 change
-- from the original R2 plan, made for cost-cap control before any bucket existed) and served
-- from a separate sandboxed domain, never here in D1. This migration only tracks metadata +
-- review/publish state.

-- Upload permission — granted per-user by an admin. Deliberately separate from admin_accounts:
-- no password/Google step-up, just a grant record. Same "no row = default state" pattern isn't
-- used here (a developer either has a row or cannot upload at all — there is no implicit
-- eligibility), unlike game_settings/user_moderation.
CREATE TABLE game_developers (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  granted_by_admin_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | REVOKED
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE game_developer_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target_user_id INTEGER NOT NULL,
  actor_admin_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- GRANTED | REVOKED | REINSTATED
  created_at TEXT NOT NULL
);

CREATE INDEX idx_game_developer_audit_log_target ON game_developer_audit_log(target_user_id, created_at);

-- One catalog entry per sandbox game. Every field below `developer_user_id` is intentionally
-- editable by an admin at any time, independent of a bundle re-upload — see
-- docs/GAME_CREATION_GUIDE.md §3.6 "generalized, admin-adjustable metadata".
--
-- Review and publish are two independent axes, not one status enum:
--   - "Is there an approved bundle at all?" = live_version_id IS NOT NULL (see
--     sandbox_game_versions below — review happens per *version*, not per game, since a
--     re-upload must be re-reviewed while the previously-approved version keeps serving).
--   - "Is it actually live to end users?" = visibility = 'PUBLIC', a separate admin toggle.
-- Approving a version never flips visibility to PUBLIC by itself — an admin does that as a
-- distinct action, and that is the moment the game actually starts being served to end users
-- (catalog listing, score submission from non-developer accounts, leaderboard visibility).
CREATE TABLE sandbox_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE, -- used verbatim as scores.game_id once live
  developer_user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  genre TEXT NOT NULL, -- free text — sandbox games are not constrained to the built-in 4 tags,
                        -- see docs/GAME_CREATION_GUIDE.md §1
  -- XP defaults to 0 and is granted explicitly by an admin, never by the developer — an
  -- unmoderated self-declared XP value would let a developer farm the daily per-game XP cap
  -- (packages/core/src/domain/progression.ts XP_DAILY_CAP_COMPLETIONS_PER_GAME) simply by
  -- publishing more games. See docs/GAME_CREATION_GUIDE.md §3.5.
  xp_per_completion INTEGER NOT NULL DEFAULT 0,
  score_unit TEXT,
  score_direction TEXT, -- 'asc' | 'desc', mirrors @owogg/game-sdk ScoreConfig.direction
  score_min INTEGER,
  score_max INTEGER,
  score_display_prefix TEXT,
  score_display_suffix TEXT,
  visibility TEXT NOT NULL DEFAULT 'PRIVATE', -- PRIVATE | PUBLIC
  live_version_id INTEGER, -- FK to sandbox_game_versions.id, declared without a formal
                            -- REFERENCES clause to avoid a forward-declaration cycle between
                            -- the two tables; enforced at the application layer instead (same
                            -- approach as user_moderation.updated_by_admin_id in migration 0023).
  -- Beta concurrent-submission quota (2026-08-17) — a FOURTH independent axis, not to be confused
  -- with the three on sandbox_game_versions below:
  --   review_slot — has this developer "spent" one of their limited concurrent submission slots
  --                 on this game? NULL | 1 | 2. Claimed atomically by SandboxGameRepository.create
  --                 (a single INSERT ... SELECT that inserts zero rows when both slots are already
  --                 taken — see D1SandboxGameRepository — so the count enforced by the UNIQUE INDEX
  --                 below is never subject to a check-then-insert race). Released back to NULL the
  --                 moment the game's submission is decided (APPROVED/REJECTED) or withdrawn, and
  --                 never reclaimed afterward — this is a *concurrent open-submissions* cap, not a
  --                 lifetime or approved-game-count cap. See SANDBOX_GAME_POLICY.
  --                 MAX_CONCURRENT_REVIEW_SLOTS (packages/core/src/domain/sandboxGames.ts) for the
  --                 single source of truth on the number "2".
  review_slot INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (visibility = 'PRIVATE' OR live_version_id IS NOT NULL),
  CHECK (review_slot IS NULL OR review_slot IN (1, 2))
);

CREATE INDEX idx_sandbox_games_developer ON sandbox_games(developer_user_id);
-- The actual enforcement of "at most 2 concurrently open submissions per developer" — a partial
-- unique index rather than an application-level COUNT(*) check, so the limit holds even under
-- concurrent requests (see D1SandboxGameRepository.create's INSERT ... SELECT, which this index
-- backstops rather than duplicates).
CREATE UNIQUE INDEX idx_sandbox_games_review_slot
  ON sandbox_games(developer_user_id, review_slot)
  WHERE review_slot IS NOT NULL;

-- One row per uploaded bundle. Immutable once written (content_hash guarantees "the bytes an
-- admin approved are the exact bytes served" — see docs/GAME_CREATION_GUIDE.md §3.2) — a
-- re-upload always inserts a new row rather than overwriting, and status only ever moves
-- PENDING_REVIEW -> APPROVED or PENDING_REVIEW -> REJECTED, never back.
--
-- Note there are now *three* independent axes across these two tables, and conflating any two of
-- them would be a bug:
--   status         (here)          — has a human approved this content?
--   publish_status (here)          — are this version's individual files actually in object storage?
--   visibility     (sandbox_games) — has an admin released the game to players?
-- A version is only servable from its immutable per-version path when publish_status = 'READY';
-- that is what keeps a half-written publish from becoming a live game missing some of its files.
CREATE TABLE sandbox_game_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL REFERENCES sandbox_games(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL, -- provider-neutral key of the *source archive* (see
                             -- core/domain/sandboxGameBundle.ts sourceArchiveObjectKey) — never
                             -- name this after a specific storage vendor again, see §3.2
  content_hash TEXT NOT NULL, -- sha-256 of the uploaded archive
  bundle_bytes INTEGER NOT NULL, -- size of the compressed archive as uploaded
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW', -- PENDING_REVIEW | APPROVED | REJECTED | WITHDRAWN
                                                  -- (WITHDRAWN = developer withdrew it themselves,
                                                  -- distinct from REJECTED which is an admin
                                                  -- decision — see SandboxGameRepository.withdrawVersion)
  reviewed_by_admin_id INTEGER,
  reviewed_at TEXT,
  reject_reason TEXT,
  uploaded_at TEXT NOT NULL,
  -- Publish axis. Populated by GameBundlePublisher, which unzips the archive exactly once and
  -- writes each file as its own object under games/<game_id>/<version_id>/ so that nothing has to
  -- be decompressed on a player's request path.
  publish_status TEXT NOT NULL DEFAULT 'UPLOADED', -- UPLOADED | PUBLISHING | READY | FAILED
  publish_error TEXT, -- short diagnostic when FAILED; never bundle contents or credentials
  published_at TEXT,
  manifest_key TEXT, -- storage key of this version's file manifest (see §3.2), set on success
  published_size_bytes INTEGER, -- sum of decompressed file sizes, distinct from bundle_bytes
  file_count INTEGER
);

CREATE INDEX idx_sandbox_game_versions_game ON sandbox_game_versions(game_id, uploaded_at);
-- Supports a future GC/verification sweep over versions stuck mid-publish or failed.
CREATE INDEX idx_sandbox_game_versions_publish ON sandbox_game_versions(publish_status, uploaded_at);
-- Bounded admin review queue: "every version still awaiting a decision, oldest first".
CREATE INDEX idx_sandbox_game_versions_pending ON sandbox_game_versions(status, uploaded_at);

-- Append-only, mirrors creator_review_audit_log / user_moderation_audit_log — no update/delete
-- path anywhere in the API.
CREATE TABLE sandbox_game_review_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL REFERENCES sandbox_games(id) ON DELETE CASCADE,
  version_id INTEGER, -- NULL for game-level actions (metadata/visibility changes) that aren't
                       -- tied to one specific version
  actor_admin_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- VERSION_APPROVED | VERSION_REJECTED | VISIBILITY_CHANGED |
                         -- METADATA_CHANGED | LIVE_VERSION_CHANGED (rollback / roll-forward) |
                         -- SUBMISSION_WITHDRAWN. `actor_admin_id` holds the developer's own user id
                         -- for SUBMISSION_WITHDRAWN (a self-service action, not an admin decision) —
                         -- the column name predates that case and isn't worth an FK-breaking rename.
  reason TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_sandbox_game_review_audit_log_game ON sandbox_game_review_audit_log(game_id, created_at);
