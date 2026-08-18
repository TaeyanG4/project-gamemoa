import { GameFrame, GAME_IFRAME_SANDBOX, GAME_IFRAME_ALLOW } from "../../features/game/GameFrame";
import { sandboxGamePlayUrl } from "../../lib/api/config";

/**
 * Compatibility wrapper. The actual implementation is now GameFrame (see
 * features/game/GameFrame.tsx), generalized from what used to be defined here directly —
 * SandboxGameFrame's own behavior is unchanged: same lazy-mount, same sandbox policy, same
 * poster/loading/reload UX. `sandboxGamePlay.tsx` (the only other consumer besides this file's own
 * test) needs no changes and still imports these exact names.
 *
 * Re-exported under their original names so nothing consuming this module — including
 * apps/web/app/test/sandboxGameFrame.test.ts, which asserts the sandbox policy directly — needs to
 * change. No Game Bridge here: this is still the plain, no-SDK embed
 * (docs/GAME_CREATION_GUIDE.md §3.3/§3.5) — see runtime/IframeRuntime.tsx for the Bridge-enabled
 * path, which nothing currently uses this component's call site for.
 */
export const SANDBOX_GAME_IFRAME_SANDBOX = GAME_IFRAME_SANDBOX;
export const SANDBOX_GAME_IFRAME_ALLOW = GAME_IFRAME_ALLOW;

export interface SandboxGameFrameProps {
  slug: string;
  title: string;
  poster?: React.ReactNode;
  className?: string;
  frameClassName?: string;
}

export function SandboxGameFrame({
  slug,
  title,
  poster,
  className,
  frameClassName,
}: SandboxGameFrameProps) {
  return (
    <GameFrame
      src={sandboxGamePlayUrl(slug)}
      title={title}
      poster={poster}
      className={className}
      frameClassName={frameClassName}
    />
  );
}
