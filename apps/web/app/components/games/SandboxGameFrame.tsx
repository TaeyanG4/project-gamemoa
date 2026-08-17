import { useState } from "react";
import { sandboxGamePlayUrl } from "../../lib/api/config";

/**
 * Attributes granted to an uploaded game's iframe. Exported so tests can assert the policy
 * directly, and so there is exactly one definition of it rather than a string duplicated across
 * every page that embeds a game.
 *
 * The iframe sandbox is **not** an anti-cheat measure — a player fully controls their own browser,
 * and the score model treats client-reported results as untrusted regardless. Its job is the other
 * direction: protecting OwOGG and its users from third-party code that a developer uploaded.
 *
 * `allow-same-origin` is deliberately absent. Adding it would hand the game a real origin and
 * therefore access to storage and (with a same-site host) potentially cookies — collapsing the
 * boundary this exists to create. It must not be added for convenience; only a demonstrated engine
 * requirement, verified against a real build, would justify revisiting it, and the fix would more
 * likely be to move games to a separate registrable domain first.
 */
export const SANDBOX_GAME_IFRAME_SANDBOX = "allow-scripts allow-pointer-lock";

/** Fullscreen is a common expectation for action/shooter builds, and is safe: it's a user-gesture
 * gated presentation change, not a capability grant. */
export const SANDBOX_GAME_IFRAME_ALLOW = "fullscreen";

export interface SandboxGameFrameProps {
  slug: string;
  title: string;
  /** Rendered before the player starts, so a catalog or detail page costs no game download. */
  poster?: React.ReactNode;
  className?: string;
  /** Wraps the iframe itself (poster/play-button and the loading overlay use `className`
   * instead) — lets a page control the frame's aspect ratio independent of the poster's own
   * layout. Defaults to filling `className`'s box. */
  frameClassName?: string;
}

/**
 * Embeds an uploaded sandbox game, mounting the iframe only once the player explicitly starts it.
 *
 * Deferring the mount matters for real reasons, not just polish: a game bundle can be tens of
 * megabytes of WASM and assets, so auto-loading on page view would spend the player's bandwidth and
 * the project's storage egress on games nobody chose to play — and a page listing several games
 * would multiply that. Once started, the game runs entirely on the player's own CPU/GPU; OwOGG
 * serves files and never executes game code.
 *
 * Minimal loading/reload UX only — no SDK, no postMessage protocol, no score/reward bridge (see
 * docs/GAME_CREATION_GUIDE.md §3.3/§3.5 for why that's deliberately out of scope for now). The
 * iframe's own `load` event (fired by the browser once the framed document and its synchronous
 * resources finish loading — a property of the `<iframe>` element itself, not something that
 * requires reaching into cross-origin content) is the only signal used to clear the loading state.
 */
export function SandboxGameFrame({
  slug,
  title,
  poster,
  className,
  frameClassName,
}: SandboxGameFrameProps) {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  // Bumping this remounts the iframe with a fresh `src` load — the "다시 시작" affordance.
  const [reloadKey, setReloadKey] = useState(0);

  const start = () => {
    setLoading(true);
    setStarted(true);
  };

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  if (!started) {
    return (
      <div className={className}>
        <div className={`relative ${frameClassName ?? ""}`}>
          {poster}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-light"
            >
              PLAY
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className={`relative ${frameClassName ?? ""}`}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-raised">
            <span className="text-xs font-bold text-text-muted">불러오는 중...</span>
          </div>
        )}
        <iframe
          key={reloadKey}
          className="h-full w-full"
          src={sandboxGamePlayUrl(slug)}
          title={title}
          sandbox={SANDBOX_GAME_IFRAME_SANDBOX}
          allow={SANDBOX_GAME_IFRAME_ALLOW}
          // The game's own document additionally carries `connect-src 'none'` from the serving
          // Worker (apps/api/src/routes/gameServing.ts), so it cannot reach the network at all.
          referrerPolicy="no-referrer"
          onLoad={() => setLoading(false)}
        />
      </div>
      <button
        type="button"
        onClick={reload}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-text-primary"
      >
        다시 시작
      </button>
    </div>
  );
}
