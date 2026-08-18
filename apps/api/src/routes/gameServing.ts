import type { Context, MiddlewareHandler } from "hono";
import { Hono } from "hono";
import {
  BUNDLE_ENTRY_PATH,
  normalizeBundleEntryPath,
  publishedVersionPrefix,
  type ServableBundleFile,
} from "@owogg/core";
import { createContainer } from "../container.js";
import { edgeCache } from "../middleware/edgeCache.js";
import { readB2Config } from "./devGames.js";
import { isLocalhost } from "./auth.js";
import type { ApiEnv } from "./auth.js";

const DEFAULT_FRONTEND_URL = "https://owogg.com";

/** Same narrow local shape as middleware/edgeCache.ts's `CloudflareCacheStorage.default` — see
 * that file's comment on why this isn't a shared type (DOM's `CacheStorage` has no `.default` and
 * shadows @cloudflare/workers-types' version in this package's mixed lib set). */
interface CloudflareCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

/** One year, the conventional ceiling for `max-age`. Safe only on the versioned path, where a URL
 * identifies one immutable published version — a new build gets a new version id and therefore a
 * new URL, so nothing ever needs purging. */
const IMMUTABLE_MAX_AGE_SECONDS = 31536000;

/** How long `/play/:slug` — which resolves to whatever is *currently* live — may be cached.
 * Bounds how long a live-version switch or rollback takes to become visible. */
const LIVE_RESOLVER_MAX_AGE_SECONDS = 60;

/**
 * Public sandbox-game delivery. Two routers with deliberately different cache semantics:
 *
 *   /play/:slug                     → mutable: resolves the game's *current* live version and
 *                                     redirects to that version's entry point.
 *   /games/:gameId/:versionId/*     → immutable: one specific published version's files, served
 *                                     straight from object storage through Cloudflare's cache.
 *
 * Both are meant to live on their own hostname (`GAME_ORIGIN`, e.g. play.owogg.com) rather than the
 * main site's, which is what makes the iframe a real origin boundary. Neither the hostname nor the
 * frontend's is hardcoded: this file only ever reads FRONTEND_URL, for the CSP that names who may
 * frame a game.
 *
 * What this code does *not* do, and must never start doing: run game code. A response here is
 * bytes — HTML, JS, WASM, textures, audio. Every frame, physics step, and AI decision happens in
 * the player's own browser on the player's own CPU/GPU, so serving a thousand concurrent players
 * costs a thousand cached file reads rather than a thousand game processes. See
 * docs/GAME_CREATION_GUIDE.md §3.
 */
export const gameServingRouter = new Hono<ApiEnv>();
export const publishedGameAssetsRouter = new Hono<ApiEnv>();

/**
 * Origin boundary enforcement (2026-08-17 beta hardening) — registered first on both routers, so
 * it runs before any cache lookup or DB read. This Worker also answers `api.owogg.com`, and
 * sandbox UGC must never be reachable there: the whole point of a separate GAME_ORIGIN host (e.g.
 * `play.owogg.com`) is that the browser treats an uploaded game as cross-origin from the real
 * site, which only holds if the game is actually *served from* that other host.
 *
 * `GAME_ORIGIN` unset means "no game-hosting domain connected yet" — fails CLOSED for everything
 * except localhost (local dev / `wrangler dev` has no reason to set it). This is deliberate: it
 * is not acceptable for sandbox UGC to be reachable through the production API host just because
 * the dedicated domain hasn't been wired up, so shipping this Worker with GAME_ORIGIN unset must
 * mean "sandbox game serving is off," not "sandbox game serving falls back to api.owogg.com."
 */
function isAllowedGameOriginHost(c: Context<ApiEnv>): boolean {
  const configured = c.env?.GAME_ORIGIN;
  if (configured) {
    try {
      return new URL(c.req.url).hostname === new URL(configured).hostname;
    } catch {
      return false; // a malformed GAME_ORIGIN must fail closed, not silently allow every host
    }
  }
  return isLocalhost(c.req.url);
}

const gameOriginHostGuard: MiddlewareHandler<ApiEnv> = async (c, next) => {
  if (!isAllowedGameOriginHost(c)) return notFound(c);
  await next();
};

gameServingRouter.use("*", gameOriginHostGuard);
publishedGameAssetsRouter.use("*", gameOriginHostGuard);

// See middleware/edgeCache.ts's safety note: caching is sound on both routers because responses
// depend only on the URL — no cookies are read, and nothing varies per viewer.
gameServingRouter.use("*", edgeCache({ ttlSeconds: LIVE_RESOLVER_MAX_AGE_SECONDS }));

/**
 * Gate registered BEFORE the byte cache below — order matters. `caches.default` returns a HIT
 * without ever calling `next()`, so if the availability check lived *after* edgeCache in this
 * chain (or inside the route handler), a game an admin just made PRIVATE would keep being served
 * out of the byte cache until its year-long entry naturally expired: a takedown that silently
 * didn't take effect. Registering this middleware first means every request re-checks
 * availability — cheaply, via its own short-lived cache entry, not a fresh D1 read each time —
 * before the (genuinely immutable) byte cache is ever consulted.
 *
 * This is a separate `caches.default` entry from the byte cache, keyed on a synthetic URL that
 * only encodes gameId+versionId (not the file path), so one lookup covers every asset request for
 * that version rather than one per file.
 */
function availabilityCacheKey(gameId: number, versionId: number): Request {
  return new Request(
    `https://owogg-internal.invalid/sandbox-game-availability/${gameId}/${versionId}`,
  );
}

const publishedAssetAvailabilityGate: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const gameId = Number(c.req.param("gameId"));
  const versionId = Number(c.req.param("versionId"));
  if (!Number.isInteger(gameId) || !Number.isInteger(versionId) || !c.env?.DB) {
    return notFound(c);
  }

  if (typeof caches === "undefined") {
    // Plain-Node test runner — no Cache API available, so just check the DB directly every time.
    const { sandboxGameUseCases } = createContainer(c.env.DB, readB2Config(c.env));
    if (!(await sandboxGameUseCases.isVersionServable(gameId, versionId))) return notFound(c);
    await next();
    return;
  }

  const cache = (caches as unknown as { default: CloudflareCache }).default;
  const key = availabilityCacheKey(gameId, versionId);

  const cached = await cache.match(key);
  if (cached) {
    if (cached.status === 404) return notFound(c);
    await next();
    return;
  }

  const { sandboxGameUseCases } = createContainer(c.env.DB, readB2Config(c.env));
  const servable = await sandboxGameUseCases.isVersionServable(gameId, versionId);
  const toStore = new Response(null, {
    status: servable ? 200 : 404,
    headers: { "Cache-Control": `public, max-age=${LIVE_RESOLVER_MAX_AGE_SECONDS}` },
  });
  try {
    c.executionCtx.waitUntil(cache.put(key, toStore));
  } catch {
    // No ExecutionContext — skip caching this fact, still enforce it below.
  }

  if (!servable) return notFound(c);
  await next();
};

publishedGameAssetsRouter.use("/:gameId/:versionId/:rest{.+}", publishedAssetAvailabilityGate);
publishedGameAssetsRouter.use("*", edgeCache({ ttlSeconds: IMMUTABLE_MAX_AGE_SECONDS }));

/** Content-Security-Policy for a game's own document. This is the in-document half of the sandbox;
 * the other half is the `sandbox` attribute on the parent page's iframe, which a response header
 * cannot set (see apps/web/app/components/games/SandboxGameFrame.tsx).
 *
 * `connect-src 'none'` is the load-bearing line: an uploaded game cannot phone home, ship telemetry,
 * pull remote code, or reach OwOGG's own API. `frame-ancestors` means only the real site can frame
 * it, so a third-party page cannot embed a game and use it as bait. */
function contentSecurityPolicy(frontendUrl: string): string {
  return [
    "default-src 'self'",
    // Engines self-host their loaders but do use inline bootstrap and WASM compilation.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "connect-src 'none'",
    `frame-ancestors ${frontendUrl}`,
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}

function isHtmlPath(path: string): boolean {
  return path.endsWith(".html") || path.endsWith(".htm");
}

/** Response's BodyInit type doesn't reliably line up with Uint8Array across this package's mixed
 * DOM + @cloudflare/workers-types lib set (same class of issue as middleware/edgeCache.ts's
 * CacheStorage note), so responses are built from plain ArrayBuffers. */
function fileResponse(
  file: ServableBundleFile,
  path: string,
  options: { maxAgeSeconds: number; immutable: boolean; frontendUrl: string },
): Response {
  const headers = new Headers({
    "Content-Type": file.contentType,
    "Cache-Control": options.immutable
      ? `public, max-age=${options.maxAgeSeconds}, immutable`
      : `public, max-age=${options.maxAgeSeconds}`,
    // Public, unauthenticated bundle bytes — this router never reads a cookie or session, so CORS
    // was never a confidentiality boundary here, only ever an accidental obstacle. A sandboxed
    // iframe (no allow-same-origin) sends Origin: null on its own <script type="module"> fetches,
    // and a `<script type="module">` is always CORS-checked (unlike a classic script) — wildcard
    // ACAO with NO Access-Control-Allow-Credentials lets that succeed without weakening anything:
    // the real security boundary on this content is the CSP below plus the iframe's sandbox flags
    // (see SandboxGameFrame.tsx), never same-origin policy on already-public files. Deliberately
    // NOT paired with Allow-Credentials — browsers reject that combination outright, and even if
    // they didn't, nothing on this path should ever be served with credentials attached.
    "Access-Control-Allow-Origin": "*",
  });
  if (file.contentEncoding) headers.set("Content-Encoding", file.contentEncoding);
  if (isHtmlPath(path)) {
    headers.set("Content-Security-Policy", contentSecurityPolicy(options.frontendUrl));
  }
  // Lets an operator confirm at a glance whether the fast published path or the migration
  // fallback served a request (see WORK_PROGRESS.md's "legacy runtime ZIP serving" decision).
  headers.set("X-Owogg-Bundle-Source", file.published ? "published" : "archive-fallback");
  return new Response(file.bytes, { status: 200, headers });
}

/** Every failure mode answers exactly the same way, so an anonymous probe can't tell an unknown
 * slug from an unreleased game from a storage outage. */
function notFound(c: Context<ApiEnv>): Response {
  return c.text("Not Found", 404);
}

// ── /play/:slug — live version resolver ──────────────────────────────────────

/**
 * Redirects to the live version's entry point rather than serving it here, because the browser's
 * base URL is what resolves a game's relative asset references. Serving index.html at
 * `/play/my-game` would make the engine request `/play/Build/game.wasm`; redirecting to
 * `/games/1/17/index.html` makes it request `/games/1/17/Build/game.wasm` — the immutable,
 * CDN-cacheable path. The Location is relative so this works unchanged whatever hostname
 * GAME_ORIGIN points at.
 */
gameServingRouter.get("/:slug", async (c) => {
  if (!c.env?.DB) return notFound(c);
  const { sandboxGameUseCases } = createContainer(c.env.DB, readB2Config(c.env));
  const resolved = await sandboxGameUseCases.resolveLiveVersion(c.req.param("slug"));
  if (!resolved) return notFound(c);

  const target = `/${publishedVersionPrefix(resolved.game.id, resolved.version.id)}${BUNDLE_ENTRY_PATH}`;
  // Explicit and short. Without a header, a 302 is subject to heuristic browser caching, which
  // could pin a player to a version an admin has already rolled back. The edge cache above only
  // stores 200s, so this redirect always re-resolves at the origin once the browser's minute is up —
  // one D1 read per game *start*, not per asset.
  c.header("Cache-Control", `public, max-age=${LIVE_RESOLVER_MAX_AGE_SECONDS}`);
  return c.redirect(target, 302);
});

/**
 * Legacy slug-relative asset path, kept only so that a game which somehow loaded through an older
 * `/play/:slug/...` URL still resolves its assets instead of hard-failing. Serves out of the live
 * version, which is the same thing the redirect above would have landed on.
 */
gameServingRouter.get("/:slug/:rest{.+}", async (c) => {
  if (!c.env?.DB) return notFound(c);
  const path = normalizeBundleEntryPath(decodeURIComponent(c.req.param("rest")));
  if (path === null) return notFound(c);

  const { sandboxGameUseCases } = createContainer(c.env.DB, readB2Config(c.env));
  const resolved = await sandboxGameUseCases.resolveLiveVersion(c.req.param("slug"));
  if (!resolved) return notFound(c);

  const file = await sandboxGameUseCases.resolvePublishedFile({
    gameId: resolved.game.id,
    versionId: resolved.version.id,
    path,
  });
  if (!file) return notFound(c);

  return fileResponse(file, path, {
    maxAgeSeconds: LIVE_RESOLVER_MAX_AGE_SECONDS,
    immutable: false, // this URL's contents change when the live version does
    frontendUrl: c.env.FRONTEND_URL || DEFAULT_FRONTEND_URL,
  });
});

// ── /games/:gameId/:versionId/* — immutable published assets ─────────────────

/**
 * The path a running game actually fetches from, and the only one that should carry meaningful
 * traffic. Nothing is decompressed here: publishing already wrote each file as its own object, so
 * a request is a single object read that Cloudflare can cache indefinitely.
 */
publishedGameAssetsRouter.get("/:gameId/:versionId/:rest{.+}", async (c) => {
  if (!c.env?.DB) return notFound(c);

  const gameId = Number(c.req.param("gameId"));
  const versionId = Number(c.req.param("versionId"));
  if (!Number.isInteger(gameId) || !Number.isInteger(versionId)) return notFound(c);

  const path = normalizeBundleEntryPath(decodeURIComponent(c.req.param("rest")));
  if (path === null) return notFound(c);

  const { sandboxGameUseCases } = createContainer(c.env.DB, readB2Config(c.env));
  const file = await sandboxGameUseCases.resolvePublishedFile({ gameId, versionId, path });
  if (!file) return notFound(c);

  return fileResponse(file, path, {
    // The entry document is deliberately not immutable-cached: it is the one file a player is
    // likely to hold across sessions, and keeping it short-lived leaves room to change response
    // headers (CSP in particular) without a version bump. Its asset references are versioned, so
    // this costs one small revalidation, not a re-download of the game.
    maxAgeSeconds: isHtmlPath(path) ? LIVE_RESOLVER_MAX_AGE_SECONDS : IMMUTABLE_MAX_AGE_SECONDS,
    immutable: !isHtmlPath(path),
    frontendUrl: c.env.FRONTEND_URL || DEFAULT_FRONTEND_URL,
  });
});
