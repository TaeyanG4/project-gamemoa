export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    const envUrl = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env
      ?.VITE_API_URL;
    if (envUrl) return envUrl;
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:8787";
    }
  }
  return "https://api.owogg.com";
}

export const API_URL = getApiUrl();

/**
 * Origin that serves uploaded sandbox game bundles. Deliberately a *different* host from the main
 * site: everything inside a game iframe is third-party code, and a separate origin is what makes
 * the browser treat it as such (no access to owogg.com's cookies, storage, or DOM) rather than
 * relying on the iframe attributes alone.
 *
 * Configured, never hardcoded to one hostname, so moving games onto a fully separate registrable
 * domain later (the stronger isolation — a sibling subdomain still shares a parent domain, so it
 * can be reached by a `document.domain`-style or cookie-scope mistake) is an env change rather
 * than a code change. Falls back to the API origin because that Worker is what serves `/play/*`
 * today; a dedicated host simply routes to the same Worker.
 */
export function getGameOrigin(): string {
  if (typeof window !== "undefined") {
    const envUrl = (import.meta as unknown as { env?: { VITE_GAME_ORIGIN?: string } }).env
      ?.VITE_GAME_ORIGIN;
    if (envUrl) return envUrl;
  }
  return API_URL;
}

export const GAME_ORIGIN = getGameOrigin();

/** URL a sandbox game is played from. Resolves the game's current live version server-side, so the
 * caller never needs to know version ids. */
export function sandboxGamePlayUrl(slug: string): string {
  return `${GAME_ORIGIN.replace(/\/+$/, "")}/play/${encodeURIComponent(slug)}`;
}

/**
 * URL a migrated SYSTEM game's standalone iframe bundle is played from — the exact-version
 * counterpart to {@link sandboxGamePlayUrl} above. Unlike a Creator game, a SYSTEM game has no
 * D1-backed "current live version" to resolve server-side, so the caller must already know which
 * published version to point at — see systemGameReleaseMap.generated.ts (built by
 * scripts/publish-official-game-bundles.ts) and gameServing.ts's
 * `/official-games/:slug/:version/*` route.
 */
export function officialGameEntryUrl(
  slug: string,
  release: { version: string; entry: string },
): string {
  return `${GAME_ORIGIN.replace(/\/+$/, "")}/official-games/${encodeURIComponent(slug)}/${encodeURIComponent(release.version)}/${release.entry}`;
}
