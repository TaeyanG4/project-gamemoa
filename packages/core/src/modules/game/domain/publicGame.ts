/**
 * The unified, read-only shape a public catalog/detail view resolves — where "a SYSTEM game and a
 * CREATOR game are the same kind of Game" first becomes something a client can actually see,
 * rather than a claim about internal architecture.
 *
 * Deliberately a discriminated union, not one flat shape with optional fields on both sides. The
 * two owners carry genuinely different metadata today: a SYSTEM game has a fixed category/tag
 * taxonomy and a bundled thumbnail asset path; a CREATOR game has free-text genre, a coarser
 * single/multi mode, and a logo served from its own byte endpoint (GET /api/games/sandbox/:slug/
 * logo). Forcing both into one optional-everything shape would mean inventing categories a
 * creator game doesn't have, or silently dropping genre from a built-in one — see
 * docs/GAME_CREATION_GUIDE.md §1 on the categories/genre taxonomy gap being real and deferred,
 * not something this type resolves.
 *
 * Never carries anything review/publish-internal or a creator's user id — same posture as
 * SandboxGamePublicDetail (packages/contracts/src/sandboxGames.ts). {@link toPublicCreatorGame}
 * narrows to this shape from a full SandboxGameRecord the same way toSandboxGameRecordResponse
 * narrows for the dev/admin-facing shape; the two exist for different audiences, not as
 * duplicated logic.
 */

import type { GameDefinition, SystemGameDefinition } from "./gameDefinition.js";
import { isSystemGameDefinition } from "./gameDefinition.js";
import type { SandboxGameRecord } from "../../../ports/sandboxGames.js";
import type { SandboxGameMode } from "../../../domain/sandboxGames.js";

export interface PublicSystemGame {
  readonly ownerType: "SYSTEM";
  readonly slug: string;
  readonly title: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly status: SystemGameDefinition["status"];
  readonly categories: SystemGameDefinition["categories"];
  readonly tags: SystemGameDefinition["tags"];
  readonly modes: SystemGameDefinition["modes"];
  readonly inputMethods: SystemGameDefinition["inputMethods"];
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly thumbnail: string;
  readonly accent?: string | undefined;
  readonly requiresAuth: boolean;
  readonly supportsLeaderboard: boolean;
}

export interface PublicCreatorGame {
  readonly ownerType: "CREATOR";
  readonly slug: string;
  readonly title: string;
  readonly shortDescription: string | null;
  readonly description: string | null;
  readonly genre: string;
  readonly mode: SandboxGameMode;
  readonly hasLogo: boolean;
  /** Hardcoded, not read off any per-game setting: a creator game has no auth-gate concept today
   * (unlike SYSTEM's `policy.requiresAuth`), and score submission for creator games is explicitly
   * unsupported (an unknown gameId — which every creator slug still is from GameRegistry's point
   * of view — is rejected outright by ScoreUseCases). These fields exist for shape symmetry with
   * PublicSystemGame, not because a creator game can currently set either one. */
  readonly requiresAuth: boolean;
  readonly supportsLeaderboard: boolean;
}

export type PublicGame = PublicSystemGame | PublicCreatorGame;

export function toPublicSystemGame(definition: GameDefinition): PublicSystemGame {
  // Signature deliberately stays `GameDefinition`, not `SystemGameDefinition` — narrowing here
  // (rather than at every call site) keeps mergePublicGames/resolvePublicGame's own signatures,
  // and therefore every existing caller (apps/api/src/routes/games.ts), untouched by the
  // CreatorGameDefinition variant now existing. See gameDefinition.ts's own doc comment for why
  // this owner-narrowing pattern mirrors PublicGame's.
  if (!isSystemGameDefinition(definition)) {
    throw new Error(
      `toPublicSystemGame called with a non-SYSTEM definition (slug "${definition.slug}", owner "${definition.owner.type}")`,
    );
  }
  return {
    ownerType: "SYSTEM",
    slug: definition.slug,
    title: definition.title,
    shortDescription: definition.shortDescription,
    description: definition.description,
    status: definition.status,
    categories: definition.categories,
    tags: definition.tags,
    modes: definition.modes,
    inputMethods: definition.inputMethods,
    minPlayers: definition.minPlayers,
    maxPlayers: definition.maxPlayers,
    thumbnail: definition.thumbnail,
    ...(definition.accent !== undefined ? { accent: definition.accent } : {}),
    requiresAuth: definition.policy.requiresAuth,
    supportsLeaderboard: definition.policy.leaderboard,
  };
}

/**
 * `game` must already be known safe to expose publicly — i.e. resolved through
 * SandboxGameUseCases.listPublic() or .resolveLiveVersion(), both PUBLIC-visibility + live-version
 * gated (see those methods' own doc comments). This function performs no gating of its own; it
 * only narrows an already-cleared record down to public-safe fields. It must never be called with
 * a record obtained any other way (e.g. an admin-facing `findById`/`listAll`).
 */
export function toPublicCreatorGame(game: SandboxGameRecord): PublicCreatorGame {
  return {
    ownerType: "CREATOR",
    slug: game.slug,
    title: game.title,
    shortDescription: game.shortDescription,
    description: game.description,
    genre: game.genre,
    mode: game.mode,
    hasLogo: game.logoKey !== null,
    requiresAuth: false,
    supportsLeaderboard: false,
  };
}

/**
 * The full public catalog: every SYSTEM game, then every currently-PUBLIC CREATOR game whose slug
 * does not collide with a SYSTEM one. SYSTEM first (not re-sorted together) matches the existing
 * web catalog's own ordering convention (apps/web/app/routes/games.tsx's
 * `[...builtInGameManifests, ...sandboxGameManifests]`) — built-in games keep a stable position
 * rather than reshuffling as creator games are added or removed. Neither half is re-sorted
 * internally: SYSTEM games arrive already slug-sorted (game-registry/'s build output), and
 * CREATOR games keep listPublic()'s own newest-first order.
 *
 * The exclusion is {@link resolvePublicGame}'s single-slug policy applied to a list: SYSTEM always
 * wins a same-slug collision, so a colliding CREATOR entry is dropped here rather than appearing
 * twice under one slug (a duplicate list key, and a listing that implicitly contradicts what
 * `GET /api/games/:slug` for that exact slug would actually resolve to). This does not fix the
 * collision — see resolvePublicGame's doc comment for what would.
 */
export function mergePublicGames(
  systemGames: readonly GameDefinition[],
  creatorGames: readonly SandboxGameRecord[],
): PublicGame[] {
  const systemSlugs = new Set(systemGames.map((g) => g.slug));
  const nonCollidingCreatorGames = creatorGames.filter((g) => !systemSlugs.has(g.slug));
  return [
    ...systemGames.map(toPublicSystemGame),
    ...nonCollidingCreatorGames.map(toPublicCreatorGame),
  ];
}

/**
 * Resolves a single slug against both sources, with SYSTEM always winning a collision.
 *
 * This is a real, currently-open gap, not a hypothetical: `assertUniqueSlugs`
 * (scripts/registry-builder.ts) only guarantees uniqueness *within* the SYSTEM registry, and
 * `sandbox_games.slug`'s UNIQUE constraint (migration 0024) is scoped the same way in the other
 * direction — nothing today stops a Game Creator from registering `reaction-time`. Fixing that
 * requires a check at creator registration time (cross-referencing the SYSTEM registry, which
 * `SandboxGameUseCases.createGame` does not do yet) — this function is not that fix. What it does
 * do is make sure that *if* the collision exists, a lookup for the official slug can never
 * silently resolve to the impostor instead: SYSTEM identity must not be shadowable by a same-slug
 * upload, so it is checked first and returned immediately regardless of what a creator has
 * registered under the same name.
 */
export function resolvePublicGame(
  systemGame: GameDefinition | null,
  creatorGame: SandboxGameRecord | null,
): PublicGame | null {
  if (systemGame) return toPublicSystemGame(systemGame);
  if (creatorGame) return toPublicCreatorGame(creatorGame);
  return null;
}
