import test from "node:test";
import assert from "node:assert/strict";
import {
  GAME_BRIDGE_MAX_PAYLOAD_BYTES,
  isHostInitMessage,
  isJsonSafeValue,
  isWithinBridgePayloadLimit,
  parseGameToHostMessage,
} from "../src/bridge/protocol.js";

// ── isHostInitMessage ────────────────────────────────────────────────────────

test("isHostInitMessage accepts exactly the HOST_INIT shape", () => {
  assert.equal(isHostInitMessage({ type: "HOST_INIT" }), true);
});

test("isHostInitMessage rejects anything else, including near-misses", () => {
  for (const bad of [
    null,
    undefined,
    "HOST_INIT",
    42,
    [],
    {},
    { type: "GAME_READY" },
    { type: "host_init" }, // wrong case
    { type: "HOST_INIT " }, // trailing whitespace makes it a different string
    { type: "HOST_INIT", sneaky: true }, // exact shape only — an extra field is a different message
  ]) {
    assert.equal(isHostInitMessage(bad), false, JSON.stringify(bad));
  }
});

test("isHostInitMessage rejects an extra field even when every other field is exactly right", () => {
  // Isolated regression for the exact-shape requirement, not just bundled into the near-misses
  // list above — a lenient bootstrap check is exactly how a compromised sibling frame could try
  // to smuggle extra data into the one message the game-side client trusts unconditionally.
  assert.equal(isHostInitMessage({ type: "HOST_INIT", ports: ["fake"] }), false);
  assert.equal(isHostInitMessage({ type: "HOST_INIT", origin: "https://evil.example" }), false);
});

// ── parseGameToHostMessage: the five well-formed shapes ──────────────────────

test("parseGameToHostMessage accepts each of the five game->host message types", () => {
  assert.deepEqual(parseGameToHostMessage({ type: "GAME_READY" }), { type: "GAME_READY" });
  assert.deepEqual(parseGameToHostMessage({ type: "GAME_STARTED" }), { type: "GAME_STARTED" });
  assert.deepEqual(parseGameToHostMessage({ type: "GAME_CANCEL" }), { type: "GAME_CANCEL" });
  assert.deepEqual(parseGameToHostMessage({ type: "GAME_COMPLETE" }), { type: "GAME_COMPLETE" });
  assert.deepEqual(parseGameToHostMessage({ type: "GAME_ERROR" }), { type: "GAME_ERROR" });
});

test("GAME_COMPLETE accepts optional score and metadata, exactly as declared", () => {
  const parsed = parseGameToHostMessage({
    type: "GAME_COMPLETE",
    score: 1234,
    metadata: { wpm: 85, accuracy: 97 },
  });
  assert.deepEqual(parsed, {
    type: "GAME_COMPLETE",
    score: 1234,
    metadata: { wpm: 85, accuracy: 97 },
  });
});

test("GAME_COMPLETE rejects a non-numeric or non-finite score", () => {
  for (const badScore of ["1234", NaN, Infinity, -Infinity, null, {}]) {
    assert.equal(
      parseGameToHostMessage({ type: "GAME_COMPLETE", score: badScore }),
      null,
      String(badScore),
    );
  }
});

test("GAME_COMPLETE rejects a non-object metadata", () => {
  for (const badMetadata of ["x", 1, [], null]) {
    assert.equal(
      parseGameToHostMessage({ type: "GAME_COMPLETE", metadata: badMetadata }),
      null,
      String(badMetadata),
    );
  }
});

// ── metadata must be recursively JSON-safe ────────────────────────────────────

test("GAME_COMPLETE rejects metadata containing a Date, Map, Set, or ArrayBuffer", () => {
  // Each of these is typeof "object" and would otherwise slip past a loose isPlainObject check —
  // JSON.stringify silently reshapes every one of them (Date -> a string, Map/ArrayBuffer -> "{}")
  // rather than rejecting them, which is exactly the "quietly means something else" failure this
  // protocol needs to avoid for data a game bundle controls.
  for (const badValue of [new Date(), new Map(), new Set([1, 2]), new ArrayBuffer(8), /x/]) {
    assert.equal(
      parseGameToHostMessage({ type: "GAME_COMPLETE", metadata: { value: badValue } }),
      null,
      Object.prototype.toString.call(badValue),
    );
  }
});

test("GAME_COMPLETE rejects a non-JSON-safe value nested arbitrarily deep inside metadata", () => {
  const nested = { a: { b: { c: [1, 2, { d: new Date() }] } } };
  assert.equal(parseGameToHostMessage({ type: "GAME_COMPLETE", metadata: nested }), null);
});

test("GAME_COMPLETE accepts metadata whose values are plain arrays and nested plain objects", () => {
  const metadata = { tags: ["fast", "clean"], detail: { combo: 3, perfect: true } };
  assert.deepEqual(parseGameToHostMessage({ type: "GAME_COMPLETE", metadata }), {
    type: "GAME_COMPLETE",
    metadata,
  });
});

test("GAME_COMPLETE accepts 한글/emoji metadata within the size limit — not rejected as unsafe", () => {
  // isJsonSafeValue must not confuse "not ASCII" with "not JSON-safe" — this is purely a string.
  const metadata = { nickname: "플레이어 🎮", note: "축하합니다!" };
  assert.deepEqual(parseGameToHostMessage({ type: "GAME_COMPLETE", metadata }), {
    type: "GAME_COMPLETE",
    metadata,
  });
});

test("isJsonSafeValue rejects a value nested past the depth guard even when it's small", () => {
  let deeplyNested: unknown = "leaf";
  for (let i = 0; i < 40; i += 1) deeplyNested = { next: deeplyNested };
  assert.equal(isJsonSafeValue(deeplyNested), false);
});

test("GAME_ERROR accepts an optional message capped at 500 characters", () => {
  assert.deepEqual(parseGameToHostMessage({ type: "GAME_ERROR", message: "oops" }), {
    type: "GAME_ERROR",
    message: "oops",
  });
  assert.equal(
    parseGameToHostMessage({ type: "GAME_ERROR", message: "x".repeat(501) }),
    null,
    "over the length cap",
  );
  assert.deepEqual(parseGameToHostMessage({ type: "GAME_ERROR", message: "x".repeat(500) }), {
    type: "GAME_ERROR",
    message: "x".repeat(500),
  });
});

// ── the "ignore, don't throw" contract for anything malformed ────────────────

test("parseGameToHostMessage returns null (never throws) for non-object input", () => {
  for (const bad of [null, undefined, "GAME_READY", 42, [], true]) {
    assert.doesNotThrow(() => parseGameToHostMessage(bad));
    assert.equal(parseGameToHostMessage(bad), null);
  }
});

test("parseGameToHostMessage rejects an unknown type, including HOST_INIT itself", () => {
  // A game must never be able to send the host-originated bootstrap type back to itself.
  assert.equal(parseGameToHostMessage({ type: "HOST_INIT" }), null);
  assert.equal(parseGameToHostMessage({ type: "SOMETHING_ELSE" }), null);
});

test("parseGameToHostMessage rejects an unexpected extra field on an otherwise-valid message", () => {
  // A lenient parser here is exactly how untrusted game code could smuggle extra data into host
  // state — every field not in the declared shape must fail the whole message, not just be dropped.
  assert.equal(parseGameToHostMessage({ type: "GAME_READY", sneaky: true }), null);
  assert.equal(parseGameToHostMessage({ type: "GAME_COMPLETE", score: 1, notAllowed: "x" }), null);
});

test("parseGameToHostMessage rejects a message with no type field at all", () => {
  assert.equal(parseGameToHostMessage({ score: 100 }), null);
  assert.equal(parseGameToHostMessage({}), null);
});

// ── payload size limit ────────────────────────────────────────────────────────

test("isWithinBridgePayloadLimit accepts a small message and rejects an oversized one", () => {
  assert.equal(isWithinBridgePayloadLimit({ type: "GAME_READY" }), true);

  const oversized = {
    type: "GAME_COMPLETE",
    metadata: { blob: "x".repeat(GAME_BRIDGE_MAX_PAYLOAD_BYTES) },
  };
  assert.equal(isWithinBridgePayloadLimit(oversized), false);
});

test("parseGameToHostMessage rejects an oversized GAME_COMPLETE before validating its fields", () => {
  const oversized = {
    type: "GAME_COMPLETE",
    score: 100,
    metadata: { blob: "x".repeat(GAME_BRIDGE_MAX_PAYLOAD_BYTES) },
  };
  assert.equal(parseGameToHostMessage(oversized), null);
});

test("isWithinBridgePayloadLimit measures actual UTF-8 bytes, not UTF-16 .length", () => {
  // 한글 is 1 UTF-16 code unit but 3 UTF-8 bytes — a `.length`-based check meaningfully
  // undercounts it. Pick a repeat count where the JS string .length is comfortably under the
  // limit (so the old, wrong check would have passed this) but the real byte size is over it.
  const korean = { type: "GAME_COMPLETE", metadata: { blob: "가".repeat(6000) } };
  const jsonLength = JSON.stringify(korean).length;
  assert.ok(
    jsonLength <= GAME_BRIDGE_MAX_PAYLOAD_BYTES,
    `test setup: expected .length (${jsonLength}) to stay under the byte limit so this case actually exercises the byte-vs-length gap`,
  );
  assert.equal(isWithinBridgePayloadLimit(korean), false);
});

test("isWithinBridgePayloadLimit accepts real 한글/emoji content that's genuinely within the byte limit", () => {
  const small = {
    type: "GAME_COMPLETE",
    metadata: { nickname: "플레이어 🎮", note: "축하합니다!" },
  };
  assert.equal(isWithinBridgePayloadLimit(small), true);
});

test("isWithinBridgePayloadLimit rejects data it can't stringify rather than throwing", () => {
  const circular: Record<string, unknown> = { type: "GAME_READY" };
  circular.self = circular;
  assert.doesNotThrow(() => isWithinBridgePayloadLimit(circular));
  assert.equal(isWithinBridgePayloadLimit(circular), false);
});
