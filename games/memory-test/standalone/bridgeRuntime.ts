import { connectStandaloneBridgeRuntime } from "@owogg/game-sdk/bridge";
import type { GameBridgeClient } from "@owogg/game-sdk/bridge";
import type { GameRuntimeContext } from "@owogg/game-sdk";

/**
 * memory-test's own thin wrapper over the shared standalone Bridge adapter
 * (@owogg/game-sdk/bridge's createStandaloneBridgeRuntime/connectStandaloneBridgeRuntime) — see
 * that module's own doc comment for why the adapter logic itself lives there instead of being
 * hand-copied into every migrated game.
 *
 * memory-test has no difficulty tiers (manifest.ts has no `difficulty` field, and
 * MemoryGameUI.tsx never reads `runtime.difficultyId`), so "normal" here is a pure placeholder —
 * the same role reaction-time's own standalone/bridgeRuntime.ts gives it.
 */
export async function connectStandaloneBridge(): Promise<{
  runtime: GameRuntimeContext;
  client: GameBridgeClient;
}> {
  return connectStandaloneBridgeRuntime("normal");
}
