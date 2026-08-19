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
 * outright — an approved, public creator game still cannot submit a score, hold a leaderboard
 * entry, earn XP, or be disabled from `/admin/games`, because this port's production
 * implementation is SYSTEM-only today too (`GAME_DEFINITIONS` covers the same four built-in
 * games `GAME_MANIFESTS` does). That gap isn't fixed by this port existing; it's fixed by a
 * future implementation that also resolves creator games — this port is what makes that swap
 * possible without touching every call site again.
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
