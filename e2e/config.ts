/**
 * Fixed local ports shared by every piece of the E2E harness (prepare script, playwright config,
 * static servers, spec files) — fixed rather than dynamically allocated because
 * `VITE_GAME_ORIGIN` has to be known and baked into apps/web's own build BEFORE anything starts
 * listening (see e2e/run.ts), so there's no "ask the OS for a free port, then tell the build about
 * it" ordering available here the way there would be for a server started after the build.
 */

/** Serves the locally-built reaction-time standalone bundle under the exact
 * official-games/<slug>/<version>/ path structure production uses — see
 * e2e/prepareLocalGameOrigin.ts. */
export const GAME_ORIGIN_PORT = 4310;

/** Serves apps/web's own SPA build (build/client), with history-API fallback. */
export const WEB_SPA_PORT = 4311;

/** Deliberately nothing listens here — apps/web's own API client code already degrades
 * gracefully (guest state, empty lists, "fail open") when a fetch to VITE_API_URL rejects; see
 * e.g. apps/web/app/features/catalog/gameAvailability.ts's own "Fail OPEN" comment. Pointing at
 * an address with no listener makes every such fetch fail fast (ECONNREFUSED) instead of hanging
 * or, worse, accidentally reaching a real host. This E2E suite has no business talking to
 * apps/api at all — it only exercises apps/web's own rendering of the SYSTEM iframe runtime. */
export const WEB_API_PORT = 4312;

export const GAME_ORIGIN_URL = `http://127.0.0.1:${GAME_ORIGIN_PORT}`;
export const WEB_BASE_URL = `http://127.0.0.1:${WEB_SPA_PORT}`;
export const WEB_API_URL = `http://127.0.0.1:${WEB_API_PORT}`;
