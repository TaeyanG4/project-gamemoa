import type { ComponentType } from "react";
import type { GameProps, GameRuntimeContext } from "@owogg/game-sdk";

export interface LegacyReactRuntimeProps {
  /** The already-loaded game module's component (see features/catalog/registry.ts's loadGame) —
   * loading it is GameHost's job, not this component's; see the module doc comment below. */
  GameComponent: ComponentType<GameProps>;
  runtime: GameRuntimeContext;
  /** Bumped by GameHost's retry handler. Changing this remounts the element below, which resets
   * the game's own internal React state without re-fetching or re-loading the module itself —
   * "다시 시작" has never re-downloaded anything, and this preserves that. */
  attemptKey: number;
}

/**
 * Mounts an already-loaded legacy React SDK game module inside GameHost's chrome.
 *
 * Deliberately the only thing this component does. Loading/lifecycle orchestration — isLoading,
 * load failure, retry — stays in GameHost, which already owns the OwOGG UI chrome surrounding any
 * runtime (header, difficulty selector, result overlay, ...) and is explicitly responsible for
 * "loading" and "game ready" in the GameHost design (see the Game Platform migration plan's
 * GameHost responsibility list). This component exists only to name and isolate the one piece of
 * that chrome that's actually runtime-specific — "how a loaded game component gets mounted" — so
 * a future IframeRuntime can be swapped in at exactly this position in GameHost's tree without
 * GameHost's own loading/result/score-submission logic changing at all. See the GameFrame/Bridge
 * follow-up for when that swap happens; nothing here assumes iframe support yet.
 */
export function LegacyReactRuntime({
  GameComponent,
  runtime,
  attemptKey,
}: LegacyReactRuntimeProps) {
  return <GameComponent key={attemptKey} runtime={runtime} />;
}
