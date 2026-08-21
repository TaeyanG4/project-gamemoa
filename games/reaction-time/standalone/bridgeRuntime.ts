import { connectGameBridge, type GameBridgeClient } from "@owogg/game-sdk/bridge";
import type { GameRuntimeContext, GameResult } from "@owogg/game-sdk";

/**
 * Adapts the Game Bridge client (the standalone-iframe transport) to the exact same
 * GameRuntimeContext shape games/reaction-time/src/game.tsx already consumes via GameProps, so the
 * game component itself needs zero changes to run through the generic iframe runtime. The host-side
 * half of this protocol is apps/web/app/features/game/runtime/gameBridgeHost.ts.
 *
 * No auth/token/API address crosses into this adapter or the iframe it runs in: `user` is always
 * null and `sessionId` is a throwaway id with no meaning to the host. Scoring and identity are
 * decided entirely server-side once GameHost forwards a completed round through its own existing
 * `POST /api/scores` submission path (see GameHost.tsx's runtime.complete) — nothing here talks
 * to the network at all, only `complete`/`emit`/`cancel` calls translate 1:1 into the five
 * game -> host Bridge messages.
 */
export function createBridgeRuntime(client: GameBridgeClient): GameRuntimeContext {
  return {
    sessionId: crypto.randomUUID(),
    user: null,
    difficultyId: "normal", // reaction-time has no difficulty tiers — see its own manifest.ts
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

/** Waits for the host's HOST_INIT handshake, then returns a ready-to-use runtime. */
export async function connectStandaloneBridge(): Promise<{
  runtime: GameRuntimeContext;
  client: GameBridgeClient;
}> {
  const client = await connectGameBridge();
  return { runtime: createBridgeRuntime(client), client };
}
