import test from "node:test";
import assert from "node:assert/strict";
import {
  connectGameBridge,
  parseGameToHostMessage,
  createStandaloneBridgeRuntime,
} from "@owogg/game-sdk/bridge";
import type { GameBridgeWindowLike } from "@owogg/game-sdk/bridge";

/**
 * aim-test's own standalone/bridgeRuntime.ts is a one-line delegation to
 * @owogg/game-sdk/bridge's connectStandaloneBridgeRuntime (itself connectGameBridge() +
 * createStandaloneBridgeRuntime() composed) — connectGameBridge() with no injected window falls
 * back to the real global `window`, which doesn't exist in this plain node:test environment (no
 * DOM), so connectStandaloneBridge() itself can't be called directly here (the same reason
 * reaction-time's own tests/bridgeRuntime.test.ts never calls its connectStandaloneBridge()
 * directly either). This suite instead composes the exact same two pieces with an injectable fake
 * window, which is a genuine, real handshake — only the `window` source differs from production.
 *
 * The adapter's general behavior (score/metadata forwarding, emit mapping) is already covered by
 * packages/game-sdk/test/standaloneRuntime.test.ts; this file covers what's specific to aim-test:
 * that a real end-to-end handshake carries "normal"/"hard" through to `runtime.difficultyId`
 * (aim-test is the one migrated SYSTEM game with real difficulty tiers), and a full
 * READY -> STARTED -> COMPLETE round trip.
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

test('end-to-end: HOST_INIT with difficultyId "hard" reaches runtime.difficultyId via a real handshake', async () => {
  const { hostSideIframeWindow, gameSideWindow } = createLinkedFakes();
  const channel = new MessageChannel();

  const gameClientPromise = connectGameBridge(gameSideWindow);
  hostSideIframeWindow.postMessage({ type: "HOST_INIT", difficultyId: "hard" }, "*", [
    channel.port2,
  ]);
  const gameClient = await gameClientPromise;
  const runtime = createStandaloneBridgeRuntime(gameClient, "normal");

  assert.equal(runtime.difficultyId, "hard");
  gameClient.disconnect();
});

test('end-to-end: HOST_INIT with difficultyId "normal" reaches runtime.difficultyId via a real handshake', async () => {
  const { hostSideIframeWindow, gameSideWindow } = createLinkedFakes();
  const channel = new MessageChannel();

  const gameClientPromise = connectGameBridge(gameSideWindow);
  hostSideIframeWindow.postMessage({ type: "HOST_INIT", difficultyId: "normal" }, "*", [
    channel.port2,
  ]);
  const gameClient = await gameClientPromise;
  const runtime = createStandaloneBridgeRuntime(gameClient, "normal");

  assert.equal(runtime.difficultyId, "normal");
  gameClient.disconnect();
});

test("end-to-end: a bare HOST_INIT (no difficultyId) falls back to the game's own default — a manual/standalone open with no real host", async () => {
  const { hostSideIframeWindow, gameSideWindow } = createLinkedFakes();
  const channel = new MessageChannel();

  const gameClientPromise = connectGameBridge(gameSideWindow);
  hostSideIframeWindow.postMessage({ type: "HOST_INIT" }, "*", [channel.port2]);
  const gameClient = await gameClientPromise;
  const runtime = createStandaloneBridgeRuntime(gameClient, "normal");

  assert.equal(runtime.difficultyId, "normal");
  gameClient.disconnect();
});

test("end-to-end: a real HOST_INIT handshake drives READY -> STARTED -> COMPLETE with score+metadata", async () => {
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
  hostSideIframeWindow.postMessage({ type: "HOST_INIT", difficultyId: "hard" }, "*", [
    channel.port2,
  ]);
  const gameClient = await gameClientPromise;
  const runtime = createStandaloneBridgeRuntime(gameClient, "normal");

  gameClient.ready();
  runtime.emit({ type: "game_started", at: Date.now() });
  await runtime.complete({
    gameId: "aim-test",
    sessionId: runtime.sessionId,
    score: 4321,
    durationMs: 4321,
    metadata: { targets: 30, avgPerTargetMs: 144, difficultyId: runtime.difficultyId },
    clientStartedAt: 0,
    clientEndedAt: 4321,
  });
  await waitUntil(() => hostEvents.length, 3);

  assert.deepEqual(hostEvents, ["GAME_READY", "GAME_STARTED", "GAME_COMPLETE"]);
  assert.deepEqual(hostComplete, {
    score: 4321,
    metadata: { targets: 30, avgPerTargetMs: 144, difficultyId: "hard" },
  });

  gameClient.disconnect();
  channel.port1.close();
});
