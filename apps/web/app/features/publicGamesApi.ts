import { useEffect, useState } from "react";
import { PublicGameListResponseSchema, PublicGameSchema } from "@owogg/contracts";
import { apiFetch } from "../lib/api/client";

/**
 * Generic public game reads. The API is the sole catalog/detail authority for both publishers;
 * legacy sandbox endpoints remain available only for compatibility callers.
 */
export function fetchPublicGame(slug: string) {
  return apiFetch(`/api/games/${encodeURIComponent(slug)}`, PublicGameSchema);
}

export function fetchPublicGames() {
  return apiFetch("/api/games", PublicGameListResponseSchema);
}

/** Shared catalog hook. A failed public read fails closed to an empty catalog; no static registry
 * or sandbox metadata fallback is allowed on the primary production path. */
export function usePublicGames() {
  const [games, setGames] = useState<Awaited<ReturnType<typeof fetchPublicGames>>["games"]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchPublicGames()
      .then((response) => {
        if (!cancelled) setGames(response.games);
      })
      .catch(() => {
        if (!cancelled) setGames([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { games, isLoading };
}
