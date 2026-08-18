import test from "node:test";
import assert from "node:assert/strict";
import { connectGameBridge, type GameBridgeWindowLike } from "@owogg/game-sdk/bridge";
import {
  createGameBridgeHost,
  type GameBridgeIframeWindowLike,
} from "../features/game/runtime/gameBridgeHost";

/**
 * Both bridge halves are unit-tested independently (packages/game-sdk/test/bridgeClient.test.ts
 * for the game side, gameBridgeHost.test.ts for the host side) — this file is the one test that
 * actually runs them against EACH OTHER, wired the way two real windows would be: the host's
 * `postMessage` calls dispatch directly into the game's `window` listeners, exactly as a browser
 * delivers a message posted into an iframe's contentWindow. No DOM is needed for this to be a
 * genuine round trip — only the MessageChannel/MessagePort pair either side ends up holding is
 * real (native Node globals), and that's the part that actually carries messages once the
 * handshake completes.
 */

function createLinkedFakes(): {
  hostSideIframeWindow: GameBridgeIframeWindowLike;
  gameSideWindow: GameBridgeWindowLike;
} {
  const hostPageWindow = {}; // stands in for the top-level window, as seen from inside the iframe
  const gameWindowListeners = new Set<(event: MessageEvent) => void>();

  const hostSideIframeWindow: GameBridgeIframeWindowLike = {
    postMessage(message, targetOrigin, transfer) {
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

/**
 * Waits for `actual()` to reach `expected`, polling instead of sleeping one fixed duration —
 * a MessagePort always delivers asynchronously, and a hardcoded `setTimeout(10)` assumes
 * delivery never takes longer than that. Costs nothing extra when delivery is prompt; only
 * spends more time on a runner that's genuinely slower, which is exactly when a fixed wait
 * would otherwise flake.
 */
async function waitUntil(actual: () => number, expected: number, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (actual() < expected && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5));
  }
}

test("a full round trip: bootstrap, GAME_READY/STARTED, GAME_COMPLETE with score+metadata", async () => {
  const { hostSideIframeWindow, gameSideWindow } = createLinkedFakes();

  // connectGameBridge() must register its listener before the host sends the bootstrap — these
  // fakes dispatch synchronously (unlike a real cross-window postMessage, which is always
  // asynchronous), so this ordering matters here in a way it wouldn't in a browser, where the
  // game's own bootstrap script has always finished registering long before the host's iframe
  // `load` handler gets around to sending HOST_INIT.
  const gameClientPromise = connectGameBridge(gameSideWindow);

  const events: string[] = [];
  let completeCalls = 0;
  let completeResult: unknown;
  const host = createGameBridgeHost(hostSideIframeWindow, {
    onReady: () => events.push("ready"),
    onStarted: () => events.push("started"),
    onComplete: (result) => {
      completeCalls += 1;
      completeResult = result;
    },
  });

  const gameClient = await gameClientPromise;
  gameClient.ready();
  gameClient.started();
  gameClient.complete({ score: 42, metadata: { wpm: 88 } });
  await waitUntil(() => completeCalls, 1);

  assert.deepEqual(events, ["ready", "started"]);
  assert.deepEqual(completeResult, { score: 42, metadata: { wpm: 88 } });

  host.close();
  gameClient.disconnect();
});

test("GAME_CANCEL and GAME_ERROR reach the host through the same real handshake", async () => {
  const { hostSideIframeWindow, gameSideWindow } = createLinkedFakes();

  const gameClientPromise = connectGameBridge(gameSideWindow);

  let cancelled = false;
  let errorCalls = 0;
  let errorMessage: string | undefined;
  const host = createGameBridgeHost(hostSideIframeWindow, {
    onCancel: () => {
      cancelled = true;
    },
    onError: (message) => {
      errorCalls += 1;
      errorMessage = message;
    },
  });

  const gameClient = await gameClientPromise;
  gameClient.cancel();
  gameClient.error("engine crashed");
  await waitUntil(() => errorCalls, 1);

  assert.equal(cancelled, true);
  assert.equal(errorMessage, "engine crashed");

  host.close();
  gameClient.disconnect();
});

test("closing the host stops delivering further messages from an already-connected game client", async () => {
  const { hostSideIframeWindow, gameSideWindow } = createLinkedFakes();

  const gameClientPromise = connectGameBridge(gameSideWindow);
  let readyCalls = 0;
  const host = createGameBridgeHost(hostSideIframeWindow, {
    onReady: () => {
      readyCalls += 1;
    },
  });
  const gameClient = await gameClientPromise;

  gameClient.ready();
  await waitUntil(() => readyCalls, 1);
  assert.equal(readyCalls, 1);

  host.close();
  gameClient.ready(); // the client has no idea the host closed — this must simply go nowhere
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(readyCalls, 1);
  gameClient.disconnect();
});

test("the client's own duplicate-complete guard and the host's independent guard agree", async () => {
  const { hostSideIframeWindow, gameSideWindow } = createLinkedFakes();

  const gameClientPromise = connectGameBridge(gameSideWindow);
  let completeCalls = 0;
  const host = createGameBridgeHost(hostSideIframeWindow, {
    onComplete: () => {
      completeCalls += 1;
    },
  });
  const gameClient = await gameClientPromise;

  gameClient.complete({ score: 1 });
  gameClient.complete({ score: 2 }); // dropped client-side before it's even sent
  await waitUntil(() => completeCalls, 1);
  await new Promise((r) => setTimeout(r, 50)); // give a wrongly-accepted second call room to show up

  assert.equal(completeCalls, 1);
  host.close();
  gameClient.disconnect();
});
