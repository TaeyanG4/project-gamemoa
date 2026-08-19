import test from "node:test";
import assert from "node:assert/strict";
import {
  createGameBridgeHost,
  type GameBridgeIframeWindowLike,
} from "../features/game/runtime/gameBridgeHost";

/**
 * createGameBridgeHost() only ever touches an injectable `contentWindow`-shaped object plus real
 * `MessageChannel`/`MessagePort` (native Node globals) — no `window`, no real iframe, no jsdom
 * needed. The fake below captures the one `postMessage(..., "*", [port2])` bootstrap call and
 * hands the captured port back to the test as "the game side", so every test here drives the
 * controller through a real, connected MessageChannel exactly the way a real iframe would.
 */

interface CapturedBootstrap {
  message: unknown;
  targetOrigin: string;
  transfer: readonly Transferable[];
}

function createFakeIframeWindow(): {
  windowLike: GameBridgeIframeWindowLike;
  getBootstrap(): CapturedBootstrap;
} {
  let captured: CapturedBootstrap | null = null;
  return {
    windowLike: {
      postMessage(message, targetOrigin, transfer) {
        captured = { message, targetOrigin, transfer };
      },
    },
    getBootstrap() {
      assert.ok(captured, "postMessage was never called");
      return captured;
    },
  };
}

function gamePortFrom(bootstrap: CapturedBootstrap): MessagePort {
  const port = bootstrap.transfer[0];
  assert.ok(port instanceof MessagePort, "bootstrap must transfer exactly a MessagePort");
  return port;
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

test("sends exactly one HOST_INIT bootstrap, wildcard target, carrying one port", () => {
  const fake = createFakeIframeWindow();
  const host = createGameBridgeHost(fake.windowLike, {});

  const bootstrap = fake.getBootstrap();
  assert.deepEqual(bootstrap.message, { type: "HOST_INIT" });
  assert.equal(bootstrap.targetOrigin, "*");
  assert.equal(bootstrap.transfer.length, 1);

  host.close();
  gamePortFrom(bootstrap).close();
});

test("sends the given difficultyId in HOST_INIT when one is passed", () => {
  const fake = createFakeIframeWindow();
  const host = createGameBridgeHost(fake.windowLike, {}, { difficultyId: "hard" });

  const bootstrap = fake.getBootstrap();
  assert.deepEqual(bootstrap.message, { type: "HOST_INIT", difficultyId: "hard" });

  host.close();
  gamePortFrom(bootstrap).close();
});

test("dispatches GAME_READY, GAME_STARTED, and GAME_CANCEL to their callbacks", async () => {
  const fake = createFakeIframeWindow();
  const calls: string[] = [];
  const host = createGameBridgeHost(fake.windowLike, {
    onReady: () => calls.push("ready"),
    onStarted: () => calls.push("started"),
    onCancel: () => calls.push("cancel"),
  });

  const gamePort = gamePortFrom(fake.getBootstrap());
  gamePort.postMessage({ type: "GAME_READY" });
  gamePort.postMessage({ type: "GAME_STARTED" });
  gamePort.postMessage({ type: "GAME_CANCEL" });
  await waitUntil(() => calls.length, 3);

  assert.deepEqual(calls, ["ready", "started", "cancel"]);
  host.close();
  gamePort.close();
});

test("dispatches GAME_COMPLETE with score and metadata through unmodified", async () => {
  const fake = createFakeIframeWindow();
  let calls = 0;
  let received: unknown;
  const host = createGameBridgeHost(fake.windowLike, {
    onComplete: (result) => {
      calls += 1;
      received = result;
    },
  });

  const gamePort = gamePortFrom(fake.getBootstrap());
  gamePort.postMessage({ type: "GAME_COMPLETE", score: 777, metadata: { level: 5 } });
  await waitUntil(() => calls, 1);

  assert.deepEqual(received, { score: 777, metadata: { level: 5 } });
  host.close();
  gamePort.close();
});

test("a second GAME_COMPLETE is dropped at the host — the game side's own dedup is not trusted", async () => {
  const fake = createFakeIframeWindow();
  let callCount = 0;
  const host = createGameBridgeHost(fake.windowLike, {
    onComplete: () => {
      callCount += 1;
    },
  });

  const gamePort = gamePortFrom(fake.getBootstrap());
  // Simulates a compromised/buggy game bypassing the game-sdk client's own guard and posting
  // directly to the port — the host must still only accept the first one.
  gamePort.postMessage({ type: "GAME_COMPLETE", score: 1 });
  gamePort.postMessage({ type: "GAME_COMPLETE", score: 2 });
  await waitUntil(() => callCount, 1);
  await new Promise((r) => setTimeout(r, 50)); // give a wrongly-accepted second call room to show up

  assert.equal(callCount, 1);
  host.close();
  gamePort.close();
});

test("a malformed or unknown message is ignored, never throws, never reaches any callback", async () => {
  const fake = createFakeIframeWindow();
  let anyCallbackFired = false;
  const host = createGameBridgeHost(fake.windowLike, {
    onReady: () => {
      anyCallbackFired = true;
    },
    onComplete: () => {
      anyCallbackFired = true;
    },
    onError: () => {
      anyCallbackFired = true;
    },
  });

  const gamePort = gamePortFrom(fake.getBootstrap());
  assert.doesNotThrow(() => {
    gamePort.postMessage({ type: "HOST_INIT" }); // the game must not be able to send this back
    gamePort.postMessage({ type: "SOMETHING_UNKNOWN" });
    gamePort.postMessage("just a string");
    gamePort.postMessage({ type: "GAME_READY", sneaky: true }); // extra field
  });
  await new Promise((r) => setTimeout(r, 50));

  assert.equal(anyCallbackFired, false);
  host.close();
  gamePort.close();
});

test("close() stops delivering further messages", async () => {
  const fake = createFakeIframeWindow();
  let calls = 0;
  const host = createGameBridgeHost(fake.windowLike, {
    onReady: () => {
      calls += 1;
    },
  });

  const gamePort = gamePortFrom(fake.getBootstrap());
  host.close();
  gamePort.postMessage({ type: "GAME_READY" });
  await new Promise((r) => setTimeout(r, 50));

  assert.equal(calls, 0);
  gamePort.close();
});

test("close() is safe to call more than once", () => {
  const fake = createFakeIframeWindow();
  const host = createGameBridgeHost(fake.windowLike, {});
  assert.doesNotThrow(() => {
    host.close();
    host.close();
  });
  gamePortFrom(fake.getBootstrap()).close();
});

test("GAME_ERROR carries its optional message through", async () => {
  const fake = createFakeIframeWindow();
  let calls = 0;
  let received: unknown;
  const host = createGameBridgeHost(fake.windowLike, {
    onError: (message) => {
      calls += 1;
      received = message;
    },
  });

  const gamePort = gamePortFrom(fake.getBootstrap());
  gamePort.postMessage({ type: "GAME_ERROR", message: "engine crashed" });
  await waitUntil(() => calls, 1);

  assert.equal(received, "engine crashed");
  host.close();
  gamePort.close();
});

test("an oversized GAME_COMPLETE payload never reaches onComplete", async () => {
  const fake = createFakeIframeWindow();
  let fired = false;
  const host = createGameBridgeHost(fake.windowLike, {
    onComplete: () => {
      fired = true;
    },
  });

  const gamePort = gamePortFrom(fake.getBootstrap());
  gamePort.postMessage({ type: "GAME_COMPLETE", metadata: { blob: "x".repeat(20_000) } });
  await new Promise((r) => setTimeout(r, 50));

  assert.equal(fired, false);
  host.close();
  gamePort.close();
});
