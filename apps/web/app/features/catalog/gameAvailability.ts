import { useEffect, useState } from "react";
import { PublicGameAvailabilityResponseSchema } from "@owogg/contracts";
import { apiFetch } from "../../lib/api";

// Module-level cache so every component calling the hook below shares one fetch instead of each
// issuing its own request — the disabled set rarely changes and is cheap to keep around for the
// lifetime of the page.
let cachedPromise: Promise<string[]> | null = null;

function fetchDisabledGameIds(): Promise<string[]> {
  cachedPromise ??= apiFetch("/api/games/availability", PublicGameAvailabilityResponseSchema)
    .then((res) => res.disabledGameIds)
    // Fail OPEN: if this one endpoint hiccups, never hide the whole catalog over it — the real
    // enforcement (rejecting score submissions) happens server-side regardless.
    .catch(() => []);
  return cachedPromise;
}

export function useDisabledGameIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void fetchDisabledGameIds().then((list) => {
      if (!cancelled) setIds(new Set(list));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ids;
}

export function useIsGameDisabled(gameId: string): boolean {
  const disabled = useDisabledGameIds();
  return disabled.has(gameId);
}
