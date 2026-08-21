/**
 * Fixed local ports shared by every piece of the E2E harness (prepare script, playwright config,
 * static servers, spec files) — fixed rather than dynamically allocated because
 * `VITE_GAME_ORIGIN` has to be known and baked into apps/web's own build BEFORE anything starts
 * listening (see e2e/run.ts), so there's no "ask the OS for a free port, then tell the build about
 * it" ordering available here the way there would be for a server started after the build.
 */

/** Serves the locally-built platform fixture under the C-1 primary `/play/<slug>` path — see
 * e2e/prepareLocalGameOrigin.ts. */
export const GAME_ORIGIN_PORT = 4310;

/** Serves apps/web's own SPA build (build/client), with history-API fallback. */
export const WEB_SPA_PORT = 4311;

/** Central local API fixture used by the browser harness. It serves the generic PublicGame detail
 * and availability reads that C-1's GameHost requires; it never points the suite at a deployed
 * API or restores a static-registry fallback. */
export const WEB_API_PORT = 4312;

export const GAME_ORIGIN_URL = `http://127.0.0.1:${GAME_ORIGIN_PORT}`;
export const WEB_BASE_URL = `http://127.0.0.1:${WEB_SPA_PORT}`;
export const WEB_API_URL = `http://127.0.0.1:${WEB_API_PORT}`;
