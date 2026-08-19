/**
 * Resolves a {@link GameDefinition} by slug — the port that will become the single source of truth
 * for "what is this game, and what are its rules?".
 *
 * Wired in production via `StaticGameRegistry(GAME_DEFINITIONS)` (apps/api/src/container.ts).
 * ScoreUseCases and GameSettingsUseCases resolve games through this port now, not by importing
 * the build-time `GAME_MANIFEST_MAP` directly — see their own doc comments for what changed.
 *
 * Why this needed to exist at all: score validation, difficulty validation and the admin kill
 * switch used to resolve a game directly through
 * `packages/core/src/registry/gameRegistry.generated.ts`, generated from `games/*` at build time.
 * A Game Creator upload has never appeared in that map, so `validateScoreByManifest` rejected it
 * outright. Creator score submission and leaderboard reads no longer go through that gap at all —
 * `CreatorScoreAcceptanceUseCases` and `CreatorLeaderboardUseCases` are separate, parallel paths
 * built from the same underlying pieces (`ScoreRepository`, `sandboxGameToScorePolicy`) rather
 * than this port. What's still missing is this port itself resolving creator games: its
 * production implementation (`StaticGameRegistry(GAME_DEFINITIONS)`) is SYSTEM-only today, so a
 * creator game still can't earn XP/achievements through that acceptance path
 * (`CreatorScoreAcceptanceUseCases` deliberately doesn't award them yet — see its own doc
 * comment) or be disabled from `/admin/games` (`GameSettingsUseCases` resolves games through this
 * same SYSTEM-only port). That gap isn't fixed by this port existing; it's fixed by a future
 * implementation that also resolves creator games — this port is what makes that swap possible
 * without touching every call site again.
 *
 * Asynchronous on purpose. The official-game implementation will be a synchronous read of a
 * generated file, but the migration explicitly allows reading existing D1 sandbox metadata as a
 * temporary compatibility source for creator games, and that cannot be synchronous. A port whose
 * signature only fits the easy implementation would have to be rewritten the moment the second one
 * arrives.
 *
 * Deliberately read-only. Registration, review and publishing already have their own use cases and
 * are not becoming registry concerns; this answers questions, it does not accept writes.
 */

import type { GameDefinition } from "../domain/gameDefinition.js";

export interface GameRegistry {
  /** `null` for an unknown slug OR a known-but-not-yet-registry-resolvable one — callers must
   * treat both the same, "not a game right now", never as "unrestricted" (the loose fallback that
   * behaviour replaced was a real hole — see docs/GAME_CREATION_GUIDE.md §3.5's 2026-08-17 note).
   * A CREATOR implementation in particular may have an upstream row (e.g. a `sandbox_games` D1
   * submission) that exists but genuinely has no `GameDefinition` to return yet — see that
   * implementation's own doc comment for what "not yet resolvable" means for it; this port does
   * not require every upstream submission to resolve, only every submission this port has already
   * decided IS a registry entry. */
  findBySlug(slug: string): Promise<GameDefinition | null>;

  /** Every registry-resolvable game, both SYSTEM and CREATOR — not necessarily every row an
   * upstream submission/review workflow has ever created. Used by catalog listing and the admin
   * games panel, which today can only see the four built-in manifests. Never confuse this with a
   * pending-submission or review queue: a row that exists upstream but isn't resolvable yet (see
   * `findBySlug`'s own doc comment) is excluded here, the same way it resolves `null` there — not
   * a bug, and not something a caller of this port needs a separate check for. */
  listAll(): Promise<readonly GameDefinition[]>;
}
