/**
 * Resolves a {@link GameDefinition} by slug — the single source of truth for "what is this game,
 * and what are its rules?", implemented by three classes today (all `apps/api/src/container.ts`):
 *
 *   - `StaticGameRegistry(GAME_DEFINITIONS)` — SYSTEM-only, exported as `systemGameRegistry`.
 *   - `CreatorGameRegistry` — CREATOR-only (D1 identity/runtime + B2 canonical metadata/policy).
 *   - `CompositeGameRegistry(systemGameRegistry, creatorGameRegistry)` — the unified SYSTEM+CREATOR
 *     read surface, exposed as `container.gameRegistry` (Stage C-3).
 *
 * A unified implementation existing does NOT mean every consumer resolves through it — SYSTEM
 * score submission (`ScoreUseCases`), the admin kill switch (`GameSettingsUseCases`), and Creator
 * registration's own SYSTEM-slug-collision check (`SandboxGameUseCases.createGame`) are all
 * deliberately still wired to `systemGameRegistry`, never the composite; see
 * `apps/api/src/container.ts`'s own doc comment on `systemGameRegistry` for exactly why each one
 * would be a real regression, not a generalization, if swapped. `container.gameRegistry` is the
 * single entry point a *future* owner-agnostic consumer should resolve games through — nothing
 * production-facing does yet.
 *
 * Why this needed to exist at all: score validation, difficulty validation and the admin kill
 * switch used to resolve a game directly through
 * `packages/core/src/registry/gameRegistry.generated.ts`, generated from `games/*` at build time.
 * A Game Creator upload has never appeared in that map, so `validateScoreByManifest` rejected it
 * outright. Creator score submission and leaderboard reads still don't go through this port at all
 * — `CreatorScoreAcceptanceUseCases` and `CreatorLeaderboardUseCases` remain separate, parallel
 * paths built from the same underlying pieces (`ScoreRepository`, `sandboxGameToScorePolicy`)
 * rather than this port, and that boundary is deliberate (see `ScoreUseCases`'s own doc comment) —
 * not a gap this port's unified implementation is meant to close by itself.
 *
 * Asynchronous on purpose. The SYSTEM implementation is a synchronous read of a generated file,
 * but the CREATOR one has to read D1 (and, once canonicalized, B2), and that cannot be
 * synchronous. A port whose signature only fits the easy implementation would have to be
 * rewritten the moment the second one arrives.
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
