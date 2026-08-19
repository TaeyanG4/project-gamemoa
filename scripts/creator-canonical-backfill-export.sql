-- creator-canonical-backfill-export.sql
--
-- The exact, unambiguous export query for Stage B-2's backfill CLI (creator-canonical-backfill.ts
-- / run-creator-canonical-backfill.ts). This tool does not query D1 itself (see
-- creator-canonical-backfill.ts's own top doc comment for why) — an operator runs this query
-- against production D1 externally and feeds its output to `--input`.
--
-- SELECTs only the columns mapSandboxGameRecordToCanonical (packages/core/src/domain/
-- creatorGameCanonicalMapper.ts) actually reads, and aliases every one of D1's snake_case columns
-- to the exact camelCase key parseBackfillInputRows (creator-canonical-backfill.ts) expects — no
-- D1-only identity/runtime column (id, developer_user_id, visibility, live_version_id,
-- review_slot, deleted_by_admin_id, logo_key, created_at) is selected at all, so there is nothing
-- for the CLI's own defense-in-depth stripping to even need to strip.
--
-- `WHERE deleted_at IS NULL` excludes soft-deleted games (migration 0026) — a deleted game has no
-- "what the game is" left to canonicalize.
--
-- Production usage (from the repo root, `owogg-d1` / apps/api/wrangler.jsonc's database_name):
--
--   wrangler d1 execute owogg-d1 --remote --config apps/api/wrangler.jsonc \
--     --file=scripts/creator-canonical-backfill-export.sql --json \
--     | jq '.[0].results' > creator-canonical-backfill-rows.json
--
--   tsx scripts/run-creator-canonical-backfill.ts --input creator-canonical-backfill-rows.json
--
-- `wrangler d1 execute --json` wraps the result set as `[{ "results": [...], "success": ...,
-- "meta": ... }]`, not a bare array — the `jq '.[0].results'` step is required, not optional; the
-- CLI's own `--input` parser rejects a non-array top level (parseBackfillInputRows) rather than
-- silently unwrapping it for you.
SELECT
  slug AS slug,
  title AS title,
  short_description AS shortDescription,
  description AS description,
  genre AS genre,
  mode AS mode,
  xp_per_completion AS xpPerCompletion,
  score_unit AS scoreUnit,
  score_direction AS scoreDirection,
  score_min AS scoreMin,
  score_max AS scoreMax,
  score_display_prefix AS scoreDisplayPrefix,
  score_display_suffix AS scoreDisplaySuffix,
  updated_at AS updatedAt
FROM sandbox_games
WHERE deleted_at IS NULL
ORDER BY slug;
