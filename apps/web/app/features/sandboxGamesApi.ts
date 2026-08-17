import { SandboxGamePublicDetailSchema } from "@owogg/contracts";
import { apiFetch } from "../lib/api/client";

/** Public (anonymous) sandbox game API — the player-facing surface, distinct from devApi.ts
 * (developer's own games, session-gated) and adminApi.ts (review, elevated-admin-gated). */

export function fetchPublicSandboxGame(slug: string) {
  return apiFetch(`/api/games/sandbox/${encodeURIComponent(slug)}`, SandboxGamePublicDetailSchema);
}
