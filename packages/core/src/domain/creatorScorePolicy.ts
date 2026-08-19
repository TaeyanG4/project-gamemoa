import type { GamePolicy } from "../modules/game/domain/gameDefinition.js";

/** The subset of a Creator D1 row {@link isCreatorScorePolicyConfigured} actually reads. */
export interface CreatorScorePolicySource {
  readonly scoreUnit: string | null;
  readonly scoreDirection: "asc" | "desc" | null;
  readonly scoreMin: number | null;
  readonly scoreMax: number | null;
}

/** What {@link isCreatorScorePolicyConfigured} narrows the four score_* columns to once it
 * returns `true` — intersected with the caller's own input type, so any other fields the caller
 * passed (e.g. `scoreDisplayPrefix`/`scoreDisplaySuffix`) stay exactly as they were. */
interface CreatorScorePolicyConfigured {
  readonly scoreUnit: string;
  readonly scoreDirection: "asc" | "desc";
  readonly scoreMin: number;
  readonly scoreMax: number;
}

/**
 * Whether a Creator D1 row's score_* columns are complete enough to build a real score policy
 * from — the one gate `sandboxGameToScorePolicy` (below), Stage B-1's
 * `mapSandboxGameRecordToCanonical` (domain/creatorGameCanonicalMapper.ts), and
 * `CreatorGameRegistry`'s own pre-canonical classification (registry/creatorGameRegistry.ts) all
 * share — extracted here rather than each re-declaring the same four-column null check.
 *
 * Unlike a SYSTEM game's GamePolicy (fixed at build time, always fully specified), a Creator
 * game's score policy is admin-set metadata that starts entirely unconfigured — every score_*
 * column is NULL until an admin sets it via SandboxGameUseCases.updateMetadata. "Not yet
 * configured" and "deliberately unscored" (`score: null` in a canonical document) are NOT the
 * same thing: this predicate answers "has an admin finished configuring this?", not "is this game
 * unscored?" — only a real B2 canonical document's own `policy.score` field can say the latter.
 * `scoreMin`/`scoreMax` of `0` are valid, present bounds — only a strict `=== null` counts as
 * unconfigured (falsy-zero would wrongly treat a real zero-min bound as missing).
 *
 * A type predicate, not a plain boolean, so both existing callers keep narrowing their own input's
 * score_* fields to non-null after this returns `true`, the same way their own inline checks used
 * to before being extracted here.
 */
export function isCreatorScorePolicyConfigured<T extends CreatorScorePolicySource>(
  row: T,
): row is T & CreatorScorePolicyConfigured {
  return (
    row.scoreUnit !== null &&
    row.scoreDirection !== null &&
    row.scoreMin !== null &&
    row.scoreMax !== null
  );
}

/**
 * TEMPORARY compatibility adapter — reads a Creator game's score policy straight off its D1
 * metadata row, since there is no GameRegistry entry for Creator games yet (see
 * packages/core/src/modules/game/ports/gameRegistry.ts: SYSTEM-only today). This exists so
 * Creator score acceptance has something correct to validate against right now, without moving
 * Creator metadata into a canonical registry structure — that migration is explicitly out of
 * scope for the task this shipped under. Whatever eventually replaces this (a real GameRegistry
 * implementation resolving both SYSTEM and CREATOR games) should make this file's only caller
 * (creatorScoreAcceptanceUseCases.ts) resolve through that instead, and this file goes away.
 *
 * Returns `null` — not a `GamePolicy` with `score: null` — the moment
 * {@link isCreatorScorePolicyConfigured} says the row isn't ready yet, and the caller must treat
 * that as "not currently accepting scores", never as validateScoreAgainstPolicy's own "null score
 * config = accept anything" behavior, which would otherwise let every freshly-registered,
 * not-yet-reviewed Creator game accept unbounded scores by default.
 */
export function sandboxGameToScorePolicy(game: {
  scoreUnit: string | null;
  scoreDirection: "asc" | "desc" | null;
  scoreMin: number | null;
  scoreMax: number | null;
  scoreDisplayPrefix?: string | null;
  scoreDisplaySuffix?: string | null;
}): GamePolicy | null {
  if (!isCreatorScorePolicyConfigured(game)) {
    return null;
  }

  return {
    score: {
      unit: game.scoreUnit,
      direction: game.scoreDirection,
      min: game.scoreMin,
      max: game.scoreMax,
      ...(game.scoreDisplayPrefix ? { displayPrefix: game.scoreDisplayPrefix } : {}),
      ...(game.scoreDisplaySuffix ? { displaySuffix: game.scoreDisplaySuffix } : {}),
    },
    // Neither is read by anything this PR calls (validateScoreAgainstPolicy only ever looks at
    // `.score`) — left honest rather than omitted: leaderboard/XP are explicitly not connected to
    // Creator scores yet (see the task this shipped under), and every caller of this adapter has
    // already required a session by the time it runs.
    leaderboard: false,
    xpPerCompletion: 0,
    requiresAuth: true,
  };
}
