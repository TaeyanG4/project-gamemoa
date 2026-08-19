import test from "node:test";
import assert from "node:assert/strict";
import { connectGameBridge, parseGameToHostMessage } from "@owogg/game-sdk/bridge";
import type { GameBridgeClient, GameBridgeWindowLike } from "@owogg/game-sdk/bridge";
import { createBridgeRuntime } from "../standalone/bridgeRuntime.js";

/**
 * createBridgeRuntime is a pure translation layer (GameBridgeClient -> GameRuntimeContext) with no
 * protocol logic of its own — the wire protocol itself (HOST_INIT handshake, message validation)
 * is already covered end-to-end by packages/game-sdk/test/bridgeClient.test.ts and
 * apps/web/app/test/gameBridgeEndToEnd.test.ts, both exercising the exact same
 * connectGameBridge/@owogg/game-sdk/bridge this file also uses. This suite covers the two things
 * only this adapter is responsible for: that it maps GameRuntimeContext calls onto the right
 * GameBridgeClient methods (fake-client unit tests), and that a real handshake reaches this exact
 * adapter correctly end-to-end with a genuine READY -> STARTED -> COMPLETE sequence — not a second
 * copy of the protocol-conformance tests those other two files already own.
 */

function createFakeClient(): { client: GameBridgeClient; calls: string[]; completed: unknown[] } {
  const calls: string[] = [];
  const completed: unknown[] = [];
  const client: GameBridgeClient = {
    ready: () => calls.push("ready"),
    started: () => calls.push("started"),
    complete: (result) => {
      calls.push("complete");
      completed.push(result);
    },
    cancel: () => calls.push("cancel"),
    error: () => calls.push("error"),
    disconnect: () => calls.push("disconnect"),
  };
  return { client, calls, completed };
}

test("createBridgeRuntime: no auth/token/API address anywhere on the runtime it hands to game.tsx", () => {
  const { client } = createFakeClient();
  const runtime = createBridgeRuntime(client);
  assert.equal(runtime.user, null);
  assert.equal(typeof runtime.sessionId, "string");
  assert.ok(runtime.sessionId.length > 0);
  // reaction-time has no difficulty tiers (manifest.ts) — a fixed, non-empty placeholder is what
  // HOST_INIT never needing to carry a real difficulty selection actually looks like.
  assert.equal(runtime.difficultyId, "normal");
});

test("createBridgeRuntime: runtime.emit(game_started) maps to client.started(), nothing else does", () => {
  const { client, calls } = createFakeClient();
  const runtime = createBridgeRuntime(client);

  runtime.emit({ type: "checkpoint", name: "round-1", at: Date.now() });
  runtime.emit({ type: "game_completed", at: Date.now() });
  runtime.emit({ type: "game_abandoned", at: Date.now() });
  assert.deepEqual(calls, []);

  runtime.emit({ type: "game_started", at: Date.now() });
  assert.deepEqual(calls, ["started"]);
});

test("createBridgeRuntime: runtime.complete forwards score+metadata only — reaction-time's rounds+tier semantics survive unchanged", async () => {
  const { client, completed } = createFakeClient();
  const runtime = createBridgeRuntime(client);
  const rounds = [212, 205, 198, 190, 187];

  await runtime.complete({
    gameId: "reaction-time",
    sessionId: runtime.sessionId,
    score: 198,
    durationMs: 1234,
    metadata: { rounds, tier: "lightning" },
    clientStartedAt: 1000,
    clientEndedAt: 2234,
  });

  assert.deepEqual(completed, [{ score: 198, metadata: { rounds, tier: "lightning" } }]);
});

test("createBridgeRuntime: runtime.complete omits metadata entirely when the game result carried none", async () => {
  const { client, completed } = createFakeClient();
  const runtime = createBridgeRuntime(client);

  await runtime.complete({
    gameId: "reaction-time",
    sessionId: runtime.sessionId,
    score: 300,
    durationMs: 500,
    clientStartedAt: 1000,
    clientEndedAt: 1500,
  });

  assert.equal(completed.length, 1);
  assert.deepEqual(completed[0], { score: 300 });
  assert.equal("metadata" in (completed[0] as object), false);
});

test("createBridgeRuntime: runtime.cancel maps to client.cancel()", () => {
  const { client, calls } = createFakeClient();
  const runtime = createBridgeRuntime(client);
  runtime.cancel();
  assert.deepEqual(calls, ["cancel"]);
});

// ── End-to-end: a real HOST_INIT handshake, driving this exact adapter ─────────────────────────

/**
 * Same fake-window wiring apps/web/app/test/gameBridgeEndToEnd.test.ts uses to test the OTHER side
 * of this same protocol (host's postMessage calls dispatch synchronously straight into the game's
 * own window listeners, exactly as a browser delivers a message posted into an iframe's
 * contentWindow) — reproduced here rather than imported because reaction-time cannot depend on
 * apps/web (wrong dependency direction; the host controller genuinely is web-app-specific). Only
 * the host HALF is reimplemented inline below (a MessageChannel + one postMessage + one port
 * listener) — deliberately not the full apps/web/.../gameBridgeHost.ts, since this test's job is
 * proving connectGameBridge + createBridgeRuntime behave correctly against a real handshake, not
 * re-testing that other file's own callback wiring.
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

test("end-to-end: a real HOST_INIT handshake drives connectGameBridge + createBridgeRuntime through READY -> STARTED -> COMPLETE", async () => {
  const { hostSideIframeWindow, gameSideWindow } = createLinkedFakes();

  // connectGameBridge() must register its listener before the host sends the bootstrap — these
  // fakes dispatch synchronously (see createLinkedFakes' own doc comment).
  const gameClientPromise = connectGameBridge(gameSideWindow);

  const hostEvents: string[] = [];
  let hostComplete: { score?: number; metadata?: Record<string, unknown> } | undefined;
  const channel = new MessageChannel();
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
  hostSideIframeWindow.postMessage({ type: "HOST_INIT" }, "*", [channel.port2]);

  const gameClient = await gameClientPromise;
  const runtime = createBridgeRuntime(gameClient);

  // Mirrors what games/reaction-time/standalone/main.tsx actually does at bootstrap, then what
  // games/reaction-time/src/game.tsx does on the first click and on the 5th round's result.
  gameClient.ready();
  runtime.emit({ type: "game_started", at: Date.now() });
  await runtime.complete({
    gameId: "reaction-time",
    sessionId: runtime.sessionId,
    score: 205,
    durationMs: 900,
    metadata: { rounds: [220, 210, 205, 200, 195], tier: "quick" },
    clientStartedAt: 1000,
    clientEndedAt: 1900,
  });
  await waitUntil(() => hostEvents.length, 3);

  assert.deepEqual(hostEvents, ["GAME_READY", "GAME_STARTED", "GAME_COMPLETE"]);
  assert.deepEqual(hostComplete, {
    score: 205,
    metadata: { rounds: [220, 210, 205, 200, 195], tier: "quick" },
  });

  gameClient.disconnect();
});
