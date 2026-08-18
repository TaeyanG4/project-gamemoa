import { MyAccessResponseSchema } from "@owogg/contracts";
import { apiFetch } from "../lib/api/client";

/** GET /api/me/access — the single call the profile dropdown (and role/program route guards)
 * need to decide what to show, across all three independent axes: Staff Role, Game Creator
 * program, Streamer program. See docs/AUTHORIZATION.md and packages/core/src/domain/staffRoles.ts.
 * Session-gated only — a guest gets a 401, a logged-in non-staff user gets `staffRole: null`. */
export function fetchMyAccess() {
  return apiFetch("/api/me/access", MyAccessResponseSchema);
}
