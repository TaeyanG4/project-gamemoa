import { useParams, Navigate } from "react-router";

/**
 * Pure half of the redirect below — extracted so the actual target URL is testable without a DOM
 * renderer (this suite has none; same scoping call as GameCard's gameCardHref). Slugs are
 * `[a-z0-9-]+` by construction (see isValidSandboxGameSlug, packages/core/src/domain/
 * sandboxGames.ts) so encoding is normally a no-op, but this is a value straight out of the URL
 * bar — a visitor can type anything into that segment — so it's still escaped defensively, same
 * as sandboxGamePlayUrl elsewhere.
 */
export function sandboxGameRedirectTarget(slug: string): string {
  return `/games/${encodeURIComponent(slug)}`;
}

/**
 * `/sandbox-games/:slug` — legacy route, kept only for compatibility with old external links and
 * bookmarks. Redirects (client-side, `replace` — so this URL never sits in browser history
 * between wherever the visitor came from and the actual game page) straight to `/games/:slug`,
 * the unified route every game — SYSTEM or Creator — now plays from (see GameCard's
 * `gameCardHref` and game-slug.tsx's `transitionalCreatorGameResolver`, which resolve a Creator
 * slug there exactly the way this route used to on its own).
 *
 * The fetch-and-render-SandboxGameFrame play UI this route used to own is gone — `/games/:slug`
 * already covers a Creator game end to end (loading state, IframeRuntime, result overlay) through
 * CreatorGameHost, so duplicating any of that here would just be a second, divergent copy of the
 * same page. SandboxGameFrame itself is untouched: it's still exercised directly by
 * apps/web/app/test/sandboxGameFrame.test.ts, and nothing about this change requires removing it.
 */
export default function SandboxGamePlayRoute() {
  const { slug = "" } = useParams();
  return <Navigate to={sandboxGameRedirectTarget(slug)} replace />;
}
