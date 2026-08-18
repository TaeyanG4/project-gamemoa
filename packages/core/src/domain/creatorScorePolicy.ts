import type { GamePolicy } from "../modules/game/domain/gameDefinition.js";

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
 * Unlike a SYSTEM game's GamePolicy (fixed at build time, always fully specified), a Creator
 * game's score policy is admin-set metadata that starts entirely unconfigured — every score_*
 * column is NULL until an admin sets it via SandboxGameUseCases.updateMetadata. "Not yet
 * configured" and "deliberately unscored" are NOT the same thing here the way they are for a
 * SYSTEM manifest (where a null `policy.score` means a real, reviewed game that just doesn't
 * track a score) — so this returns `null` for a Creator game with an incomplete policy, and the
 * caller must treat that as "not currently accepting scores", never as validateScoreAgainstPolicy's
 * own "null score config = accept anything" behavior, which would otherwise let every
 * freshly-registered, not-yet-reviewed Creator game accept unbounded scores by default.
 */
export function sandboxGameToScorePolicy(game: {
  scoreUnit: string | null;
  scoreDirection: "asc" | "desc" | null;
  scoreMin: number | null;
  scoreMax: number | null;
  scoreDisplayPrefix?: string | null;
  scoreDisplaySuffix?: string | null;
}): GamePolicy | null {
  if (
    game.scoreUnit === null ||
    game.scoreDirection === null ||
    game.scoreMin === null ||
    game.scoreMax === null
  ) {
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
