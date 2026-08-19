import { connectGameBridge, type GameBridgeClient } from "./client.js";
import type { GameRuntimeContext } from "../react/module.js";
import type { GameResult } from "../contracts/result.js";

/**
 * Adapts a Game Bridge client into the exact `GameRuntimeContext` shape every games/* React
 * component already consumes via `GameProps` — shared by every migrated SYSTEM game's
 * `standalone/bridgeRuntime.ts` (aim-test, memory-test, typing-test) so the same ~20 lines of glue
 * isn't hand-copied three more times. reaction-time's own `standalone/bridgeRuntime.ts` predates
 * this file and is left as its own hand-written copy rather than migrated onto it — this is the
 * one piece of genuine, verbatim duplication across the four games' standalone adapters;
 * everything else (main.tsx bootstrap, index.html, vite.config.ts, style.css) stays per-game
 * because each has real per-game differences (title, Tailwind content globs, entry component
 * import). Deliberately NOT a bigger "standalone game framework" — see GameHost.tsx's own doc
 * comment on resolveGameRuntimeKind for the same minimal-extraction posture on the host side.
 *
 * `user` is always `null` and `sessionId` is a throwaway id with no meaning to the host — no
 * auth/token/API address ever crosses into a standalone game bundle. `difficultyId` comes from
 * `client.difficultyId` (set from the host's HOST_INIT bootstrap — see protocol.ts's
 * HostInitMessage) when the host sent one, falling back to `fallbackDifficultyId` for a game with
 * no difficulty tiers (memory-test, typing-test both pass "normal", which they never actually
 * read off `runtime.difficultyId`).
 */
export function createStandaloneBridgeRuntime(
  client: GameBridgeClient,
  fallbackDifficultyId = "normal",
): GameRuntimeContext {
  return {
    sessionId: crypto.randomUUID(),
    user: null,
    difficultyId: client.difficultyId ?? fallbackDifficultyId,
    emit: (event) => {
      if (event.type === "game_started") client.started();
    },
    complete: async (result: GameResult) => {
      client.complete({
        score: result.score,
        ...(result.metadata ? { metadata: result.metadata } : {}),
      });
    },
    cancel: () => {
      client.cancel();
    },
  };
}

/** Waits for the host's HOST_INIT handshake, then returns a ready-to-use runtime built by
 * {@link createStandaloneBridgeRuntime}. */
export async function connectStandaloneBridgeRuntime(fallbackDifficultyId?: string): Promise<{
  runtime: GameRuntimeContext;
  client: GameBridgeClient;
}> {
  const client = await connectGameBridge();
  // Passing `undefined` explicitly still lets createStandaloneBridgeRuntime's own default
  // parameter ("normal") apply — JS default parameters trigger on an explicit `undefined` the
  // same as an omitted argument.
  return { runtime: createStandaloneBridgeRuntime(client, fallbackDifficultyId), client };
}
