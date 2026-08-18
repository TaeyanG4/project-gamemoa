import { useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { GameFrame } from "../GameFrame";
import { createGameBridgeHost, type GameBridgeHost } from "./gameBridgeHost";

export interface IframeRuntimeProps {
  src: string;
  title: string;
  poster?: ReactNode;
  className?: string;
  frameClassName?: string;
  /** Bumped by GameHost's retry handler — same convention as LegacyReactRuntime's attemptKey.
   * Applied as GameFrame's `key`, so a retry fully remounts the iframe (fresh `started`/loading
   * state, a real reload — not just a Bridge reset) exactly the way "다시 시작" already worked;
   * the Bridge for the previous attempt is torn down in the same effect that reacts to this. */
  attemptKey: number;
  onReady?: () => void;
  onStarted?: () => void;
  onComplete?: (result: { score?: number; metadata?: Record<string, unknown> }) => void;
  onCancel?: () => void;
  onError?: (message?: string) => void;
}

/**
 * The iframe-backed counterpart to runtime/LegacyReactRuntime.tsx — mounts a Bridge-driven game
 * inside GameFrame's existing lazy-mount/sandbox embed and wires the Game Bridge to it.
 *
 * Not wired into GameHost yet, and no game uses it yet — this PR only establishes the runtime
 * itself; see the ball-dodge reference-integration follow-up for when GameHost actually chooses
 * between this and LegacyReactRuntime for a given game.
 */
export function IframeRuntime({
  src,
  title,
  poster,
  className,
  frameClassName,
  attemptKey,
  onReady,
  onStarted,
  onComplete,
  onCancel,
  onError,
}: IframeRuntimeProps) {
  const bridgeRef = useRef<GameBridgeHost | null>(null);

  const closeBridge = useCallback(() => {
    bridgeRef.current?.close();
    bridgeRef.current = null;
  }, []);

  // Safety net for "unmount/retry -> port.close() + listener cleanup": covers both a true unmount
  // and an attemptKey change, even in the (should-never-happen) case where the new attempt's
  // iframe never fires `load` to trigger the defensive close in handleFrameLoad below.
  useEffect(() => {
    return closeBridge;
  }, [attemptKey, closeBridge]);

  const handleFrameLoad = useCallback(
    (iframe: HTMLIFrameElement) => {
      // Defensive: GameFrame's own "다시 시작" button reloads the iframe (a fresh `load` event)
      // independently of attemptKey, so a bridge from the previous load must never be left
      // dangling here either.
      closeBridge();

      const contentWindow = iframe.contentWindow;
      if (!contentWindow) return;

      bridgeRef.current = createGameBridgeHost(contentWindow, {
        ...(onReady ? { onReady } : {}),
        ...(onStarted ? { onStarted } : {}),
        ...(onComplete ? { onComplete } : {}),
        ...(onCancel ? { onCancel } : {}),
        ...(onError ? { onError } : {}),
      });
    },
    [closeBridge, onReady, onStarted, onComplete, onCancel, onError],
  );

  return (
    <GameFrame
      key={attemptKey}
      src={src}
      title={title}
      poster={poster}
      className={className}
      frameClassName={frameClassName}
      onFrameLoad={handleFrameLoad}
    />
  );
}
