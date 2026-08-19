import { connectStandaloneBridgeRuntime } from "@owogg/game-sdk/bridge";
import type { GameBridgeClient } from "@owogg/game-sdk/bridge";
import type { GameRuntimeContext } from "@owogg/game-sdk";

/**
 * aim-test's own thin wrapper over the shared standalone Bridge adapter
 * (@owogg/game-sdk/bridge's createStandaloneBridgeRuntime/connectStandaloneBridgeRuntime) — see
 * that module's own doc comment for why the adapter logic itself lives there instead of being
 * hand-copied into every migrated game.
 *
 * "normal" is only a defensive fallback for running this bundle in isolation (manual testing, a
 * bare `index.html` open with no host): GameHost.tsx always sends a real `difficultyId` for
 * aim-test in production (it's the one migrated SYSTEM game with real difficulty tiers — see
 * GameHost.tsx and manifest.ts's own `difficulty.defaultLevelId`), so `client.difficultyId` wins
 * whenever a host is actually present.
 */
export async function connectStandaloneBridge(): Promise<{
  runtime: GameRuntimeContext;
  client: GameBridgeClient;
}> {
  return connectStandaloneBridgeRuntime("normal");
}
