/**
 * Resolves a {@link GameDefinition} by slug — the port that will become the single source of truth
 * for "what is this game, and what are its rules?".
 *
 * **Interface only in this PR.** There is no implementation yet, nothing is wired into the
 * container, and ScoreUseCases/GameSettingsUseCases still read the build-time
 * `GAME_MANIFEST_MAP` exactly as before. Introducing the port on its own keeps the runtime
 * unchanged while giving the next PRs something to implement against.
 *
 * Why this needs to exist at all: score validation, difficulty validation and the admin kill
 * switch all resolve a game through `packages/core/src/registry/gameRegistry.generated.ts`, which
 * is generated from `games/*` at build time. A Game Creator upload has never appeared in that map,
 * so `validateScoreByManifest` rejects it outright — an approved, public creator game currently
 * cannot submit a score, hold a leaderboard entry, earn XP, or be disabled from `/admin/games`.
 * That is not a gap to patch at the call site; it is the registry lookup itself needing to become
 * a port with more than one implementation behind it.
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
  /** `null` for an unknown slug. Callers must treat that as "not a game", never as "unrestricted" —
   * the loose fallback that behaviour replaced was a real hole (see docs/GAME_CREATION_GUIDE.md
   * §3.5's 2026-08-17 note). */
  findBySlug(slug: string): Promise<GameDefinition | null>;

  /** Every known game, both SYSTEM and CREATOR. Used by catalog listing and the admin games panel,
   * which today can only see the four built-in manifests. */
  listAll(): Promise<readonly GameDefinition[]>;
}
