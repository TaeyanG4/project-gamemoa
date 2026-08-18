/**
 * What a game *is*, independent of how it is stored or who uploaded it.
 *
 * This is the type the unified Game Registry will resolve (see ../ports/gameRegistry.ts). Nothing
 * in this PR produces or consumes one yet — it exists so the following PRs have a single agreed
 * shape to converge the two current sources on:
 *
 *   games/<name>/src/manifest.ts  (GameManifest, build-time, official games)
 *   sandbox_games                 (D1 row, runtime, Game Creator uploads)
 *
 * Deliberately built on `@owogg/game-sdk/contracts`' existing vocabulary (GameMode, InputMethod,
 * DifficultyConfig, ScoreConfig) rather than redeclaring parallel copies of it. A definition must
 * be expressible from today's GameManifest without loss, or the migration would start by throwing
 * away catalog metadata that already works.
 */

import type {
  DifficultyConfig,
  GameMode,
  GameStatus,
  InputMethod,
  ScoreConfig,
} from "@owogg/game-sdk/contracts";
import type { GameOwner } from "./gameOwner.js";

/**
 * The half a game's author does NOT get to decide.
 *
 * A creator's `owogg.game.json` is a *submission manifest* — a request ("register me with this
 * title and genre"), not policy. Scoring bounds, leaderboard participation, XP and auth
 * requirements are operator decisions, because each of them is directly farmable: XP in particular
 * is capped per game (progression.ts's XP_DAILY_CAP_COMPLETIONS_PER_GAME), so a self-declared
 * value would let anyone multiply their own cap by publishing more games. Keeping the two apart in
 * the type system is what stops a future route from accidentally trusting one as the other.
 */
export interface GamePolicy {
  /**
   * Scoring rules, or `null` for a game that isn't scored at all. Reuses the SDK's ScoreConfig so
   * that direction/min/max/unit/display formatting have exactly one definition across the
   * codebase — `formatScore` already reads this shape, and score validation will read it from
   * here instead of from the build-time GAME_MANIFEST_MAP.
   */
  readonly score: ScoreConfig | null;
  /** Whether accepted submissions appear on a public leaderboard. */
  readonly leaderboard: boolean;
  /** Server-authoritative XP per accepted completion. Starts at 0 for creator games and is raised
   * only by an operator — see docs/GAME_CREATION_GUIDE.md §3.5. */
  readonly xpPerCompletion: number;
  /** Whether a player must be signed in to play at all (distinct from needing an account to
   * *submit* a score, which authentication already governs). */
  readonly requiresAuth: boolean;
}

/** Multiple separately-scored difficulty tiers, or `undefined` for the single-tier default. */
export type GameDifficulty = DifficultyConfig;

export interface GameDefinition {
  /**
   * Global identity, and the only one. A GameManifest carries both `id` and `slug` (identical in
   * all four shipped games); scores, leaderboards, favorites and recent-plays are all keyed by it,
   * so it must never change once a game ships — see docs/GAME_CREATION_GUIDE.md and the migration
   * plan's "slug is identity" rule.
   *
   * Uniqueness is global across SYSTEM and CREATOR games, which is what today's schema cannot
   * express: `sandbox_games.slug` is UNIQUE only among sandbox rows, so nothing currently stops an
   * uploaded game from claiming `reaction-time`. The registry is where that gets enforced.
   */
  readonly slug: string;
  readonly owner: GameOwner;

  readonly title: string;
  readonly shortDescription: string;
  readonly description: string;

  readonly status: GameStatus;
  readonly categories: readonly string[];
  readonly tags: readonly string[];

  readonly modes: readonly GameMode[];
  readonly inputMethods: readonly InputMethod[];
  readonly minPlayers: number;
  readonly maxPlayers: number;

  readonly thumbnail: string;
  readonly accent?: string | undefined;
  readonly estimatedRoundSeconds?: number | undefined;

  readonly difficulty?: GameDifficulty | undefined;
  /** Whether the game can record/replay a session. Every game is `false` today. */
  readonly supportsReplay: boolean;

  readonly policy: GamePolicy;
}

/** Whether a submitted score is even meaningful for this game. */
export function isScored(definition: GameDefinition): boolean {
  return definition.policy.score !== null;
}
