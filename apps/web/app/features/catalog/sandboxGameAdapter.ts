import { useEffect, useState } from "react";
import type { GameManifest, GameMode } from "@owogg/game-sdk";
import type { SandboxGamePublicDetail } from "@owogg/contracts";
import { API_URL } from "../../lib/api/config";
import { fetchPublicSandboxGames } from "../sandboxGamesApi";

/** Site favicon, reused as the catalog-card thumbnail for a sandbox game that has no logo (a game
 * registered before logos were required, 2026-08-18 — see docs/GAME_CREATION_GUIDE.md §3.6.2).
 * GameThumbnail already renders any `thumbnail` string that looks like a real path/URL as an
 * <img>, so pointing it at the favicon here needs no changes to that shared component. */
const FALLBACK_LOGO_PATH = "/favicon.svg";

/** OwOGG runs no server-side game-state relay (see docs/GAME_CREATION_GUIDE.md §3.2.2's explicit
 * non-goals) — a sandbox game's "multi" mode is understood as same-device/local multiplayer,
 * never online, so it maps to the richer built-in-game GameMode's "local-multi" rather than
 * "online-multi". */
function toGameMode(mode: SandboxGamePublicDetail["mode"]): GameMode {
  return mode === "multi" ? "local-multi" : "single";
}

/**
 * Adapts one public sandbox game into the same `GameManifest` shape the built-in-game catalog
 * grid (`GameGrid`/`GameCard`) already renders, so the two can sit in one merged list without the
 * shared UI needing to know sandbox games exist as a separate concept.
 *
 * Known gap, not solved here: a sandbox game's creator-chosen slug is only checked for uniqueness
 * against *other sandbox games* (the DB's UNIQUE constraint) — nothing currently stops one from
 * colliding with a built-in game's slug, which would produce two cards sharing a React key in the
 * merged grid. `packages/core` deliberately has no dependency on the built-in game registry (a
 * web-app-only package) to check against, so fixing this means either moving the registry
 * somewhere core can see it or validating client-side before upload — neither done yet.
 */
export function sandboxGameToManifest(game: SandboxGamePublicDetail): GameManifest {
  return {
    id: game.slug,
    slug: game.slug,
    title: game.title,
    shortDescription: game.shortDescription ?? "",
    description: game.description ?? "",
    modes: [toGameMode(game.mode)],
    status: "published",
    // No match against the built-in 4-tag taxonomy (reaction/brain/aim/typing) on purpose — a
    // sandbox game's free-text `genre` doesn't fit it, so leaving categories empty means it shows
    // under "전체" only, never mis-filed under a built-in category chip. See
    // docs/GAME_CREATION_GUIDE.md §1's note on this being a known, deferred taxonomy gap.
    categories: [],
    tags: [],
    minPlayers: 1,
    maxPlayers: game.mode === "multi" ? 8 : 1,
    thumbnail: game.hasLogo
      ? `${API_URL}/api/games/sandbox/${encodeURIComponent(game.slug)}/logo`
      : FALLBACK_LOGO_PATH,
    requiresAuth: false,
    supportsLeaderboard: true,
    inputMethods: ["mouse", "keyboard", "touch"],
    supportsReplay: false,
    version: "sandbox",
  };
}

/** Fetches every currently-PUBLIC sandbox game and adapts it to GameManifest — fails open (empty
 * list) on error, same posture as gameAvailability.ts's useDisabledGameIds, so a hiccup on this
 * one endpoint never breaks the built-in catalog it's merged alongside. */
export function useSandboxCatalogManifests(): GameManifest[] {
  const [games, setGames] = useState<GameManifest[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchPublicSandboxGames()
      .then((res) => {
        if (!cancelled) setGames(res.games.map(sandboxGameToManifest));
      })
      .catch(() => {
        // fail open — see doc comment above
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return games;
}
