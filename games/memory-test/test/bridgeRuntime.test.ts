import test from "node:test";
import assert from "node:assert/strict";
import {
  connectGameBridge,
  parseGameToHostMessage,
  createStandaloneBridgeRuntime,
} from "@owogg/game-sdk/bridge";
import type { GameBridgeWindowLike } from "@owogg/game-sdk/bridge";

/**
 * memory-test's own standalone/bridgeRuntime.ts is a one-line delegation to
 * @owogg/game-sdk/bridge's connectStandaloneBridgeRuntime — see aim-test/test/bridgeRuntime.test.ts's
 * doc comment for why this suite composes connectGameBridge(fakeWindow) +
 * createStandaloneBridgeRuntime directly instead of calling connectStandaloneBridge() itself (DOM-
 * dependent, no window in this plain node:test environment). The adapter's general behavior is
 * already covered by packages/game-sdk/test/standaloneRuntime.test.ts; this file just proves a
 * real end-to-end handshake works for memory-test specifically, preserving its level/grade
 * metadata semantics.
 */

function createLinkedFakes(): {
  hostSideIframeWindow: {
    postMessage(message: unknown, targetOrigin: string, transfer: Transferable[]): void;
  };
  gameSideWindow: GameBridgeWindowLike;
} {
  const hostPageWindow = {};
  const gameWindowListeners = new Set<(event: MessageEvent) => void>();

  const hostSideIframeWindow = {
    postMessage(message: unknown, _targetOrigin: string, transfer: Transferable[]) {
      const event = {
        data: message,
        source: hostPageWindow,
        ports: transfer,
      } as unknown as MessageEvent;
      for (const listener of [...gameWindowListeners]) listener(event);
    },
  };

  const gameSideWindow: GameBridgeWindowLike = {
    parent: hostPageWindow,
    addEventListener(_type, listener) {
      gameWindowListeners.add(listener);
    },
    removeEventListener(_type, listener) {
      gameWindowListeners.delete(listener);
    },
  };

  return { hostSideIframeWindow, gameSideWindow };
}

async function waitUntil(actual: () => number, expected: number, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (actual() < expected && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5));
  }
}

test('connectGameBridge + createStandaloneBridgeRuntime: no auth/token/API address — user is null, difficultyId falls back to "normal" (memory-test has no tiers)', async () => {
  const { hostSideIframeWindow, gameSideWindow } = createLinkedFakes();
  const channel = new MessageChannel();

  const gameClientPromise = connectGameBridge(gameSideWindow);
  hostSideIframeWindow.postMessage({ type: "HOST_INIT" }, "*", [channel.port2]);
  const gameClient = await gameClientPromise;
  const runtime = createStandaloneBridgeRuntime(gameClient, "normal");

  assert.equal(runtime.user, null);
  assert.equal(runtime.difficultyId, "normal");
  gameClient.disconnect();
});

test("end-to-end: a real HOST_INIT handshake drives READY -> STARTED -> COMPLETE, preserving level+grade metadata", async () => {
  const { hostSideIframeWindow, gameSideWindow } = createLinkedFakes();
  const channel = new MessageChannel();

  const hostEvents: string[] = [];
  let hostComplete: { score?: number; metadata?: Record<string, unknown> } | undefined;
  channel.port1.onmessage = (event: MessageEvent) => {
    const message = parseGameToHostMessage(event.data);
    if (!message) return;
    hostEvents.push(message.type);
    if (message.type === "GAME_COMPLETE") {
      hostComplete = {
        ...(message.score !== undefined ? { score: message.score } : {}),
        ...(message.metadata !== undefined ? { metadata: message.metadata } : {}),
      };
    }
  };

  const gameClientPromise = connectGameBridge(gameSideWindow);
  hostSideIframeWindow.postMessage({ type: "HOST_INIT" }, "*", [channel.port2]);
  const gameClient = await gameClientPromise;
  const runtime = createStandaloneBridgeRuntime(gameClient, "normal");

  gameClient.ready();
  runtime.emit({ type: "game_started", at: Date.now() });
  await runtime.complete({
    gameId: "memory-test",
    sessionId: runtime.sessionId,
    score: 7,
    durationMs: 9000,
    metadata: { level: 7, sequenceLength: 8, grade: "A" },
    clientStartedAt: 0,
    clientEndedAt: 9000,
  });
  await waitUntil(() => hostEvents.length, 3);

  assert.deepEqual(hostEvents, ["GAME_READY", "GAME_STARTED", "GAME_COMPLETE"]);
  assert.deepEqual(hostComplete, {
    score: 7,
    metadata: { level: 7, sequenceLength: 8, grade: "A" },
  });

  gameClient.disconnect();
  channel.port1.close();
});
