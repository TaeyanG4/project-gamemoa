import { useEffect, useState } from "react";
import type { PublicCreatorGame, PublicGame } from "@owogg/contracts";
import { gameManifests } from "../catalog/registry";
import { fetchPublicGame } from "../publicGamesApi";

/**
 * TRANSITIONAL. Isolates exactly one decision — "does this slug belong to one of the four
 * built-in SYSTEM games (GameHost's existing LegacyReactRuntime path, entirely unchanged), or to
 * a Creator game (GameHost's IframeRuntime counterpart, CreatorGameHost)?" — and nothing else
 * about how a Creator game plays. Deliberately its own file rather than a branch inside GameHost
 * or a field on GameDefinition: this is a stopgap until a real GameRegistry resolves both owner
 * kinds through one call, at which point this whole file is what gets deleted. Until then, the
 * check has to live somewhere, and "somewhere clearly labeled and easy to find" beats "smeared
 * across GameHost's 700 lines" or "a permanent field the domain model has to carry forever for a
 * migration step".
 *
 * Resolves through GET /api/games/:slug (the unified Game Platform read model —
 * packages/contracts/src/games.ts), not GET /api/games/sandbox/:slug — the task calls for
 * resolving a Creator game through the unified endpoint specifically, so this already exercises
 * the real cross-owner resolution path rather than a sandbox-only shortcut.
 *
 * `resolveGameSource` is the pure part of this (no React, no DOM) — the async decision itself,
 * exercised directly in apps/web/app/test/transitionalCreatorGameResolver.test.ts against fake
 * `isSystemSlug`/`fetchPublicGame`. `useGameSourceResolution` is the thin React wiring around it.
 */
export type GameSourceResolution =
  | { status: "loading" }
  | { status: "resolved"; kind: "system" }
  | { status: "resolved"; kind: "creator"; game: PublicCreatorGame }
  | { status: "resolved"; kind: "not_found" };

export interface GameSourceResolverDeps {
  isSystemSlug: (slug: string) => boolean;
  fetchPublicGame: (slug: string) => Promise<PublicGame>;
}

export async function resolveGameSource(
  slug: string,
  deps: GameSourceResolverDeps,
): Promise<GameSourceResolution> {
  if (deps.isSystemSlug(slug)) return { status: "resolved", kind: "system" };

  try {
    const game = await deps.fetchPublicGame(slug);
    return game.ownerType === "CREATOR"
      ? { status: "resolved", kind: "creator", game }
      : // Defensive only: isSystemSlug and the registry's SYSTEM set are built from the same
        // source and should never disagree about a slug being SYSTEM-owned. Reaching this branch
        // would mean that invariant broke, not a real product state.
        { status: "resolved", kind: "system" };
  } catch {
    // 404 (unknown slug) and any network/contract failure both mean "not a Creator game either"
    // — GameHost already has its own errorGameNotFound path for this via loadGame() returning
    // null, so this just lets that existing handling take over.
    return { status: "resolved", kind: "not_found" };
  }
}

function isSystemSlug(slug: string): boolean {
  return gameManifests.some((m) => m.slug === slug);
}

export function useGameSourceResolution(slug: string): GameSourceResolution {
  // Synchronous for a SYSTEM slug (gameManifests is a build-time list, no network) — the four
  // built-in games resolve on the very first render, with no loading flash, matching pre-existing
  // behavior for them exactly.
  const [resolution, setResolution] = useState<GameSourceResolution>(() =>
    isSystemSlug(slug) ? { status: "resolved", kind: "system" } : { status: "loading" },
  );

  useEffect(() => {
    let isMounted = true;
    setResolution(
      isSystemSlug(slug) ? { status: "resolved", kind: "system" } : { status: "loading" },
    );

    resolveGameSource(slug, { isSystemSlug, fetchPublicGame }).then((result) => {
      if (isMounted) setResolution(result);
    });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  return resolution;
}
