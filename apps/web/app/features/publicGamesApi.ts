import { PublicGameSchema } from "@owogg/contracts";
import { apiFetch } from "../lib/api/client";

/**
 * GET /api/games/:slug — the unified Game Platform read model (SYSTEM ∪ CREATOR;
 * apps/api/src/routes/games.ts), returned as `PublicGame`'s discriminated union. Today this has
 * exactly one caller: features/game/transitionalCreatorGameResolver.ts, which uses it purely to
 * decide "is this slug a Creator game?" — not a general-purpose catalog client. The main catalog
 * still reads GET /api/games/sandbox* (features/catalog/sandboxGameAdapter.ts) unchanged; folding
 * that over onto this unified endpoint is a separate, later step (see games.ts's own doc comment).
 */
export function fetchPublicGame(slug: string) {
  return apiFetch(`/api/games/${encodeURIComponent(slug)}`, PublicGameSchema);
}
