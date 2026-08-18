/**
 * The Host <-> Game postMessage/MessageChannel protocol — six message types, no generic RPC
 * framework (YAGNI; see the Game Platform migration plan's explicit "don't build more than this"
 * note on Game Bridge). Both `client.ts` (runs inside the game's iframe) and the host-side
 * controller (apps/web/app/features/game/runtime/) import these same validators, so there is
 * exactly one place that defines what a well-formed message looks like — hand-written rather than
 * built on a schema library (matching scripts/game-registry-schema.ts's own reasoning): this must
 * stay importable into an arbitrary third-party game bundle with zero added dependencies, and the
 * validation is small enough that hand-writing it costs less than a library would.
 *
 * Every parse function returns `null` for anything that doesn't fit — untrusted input (postMessage
 * fires for literally any script that can reach the page, and a compromised or buggy game bundle
 * is explicitly the threat model here) is rejected silently, never thrown. See client.ts and the
 * host controller for why "ignore, don't throw" is the correct response.
 */

/** Bootstrap message, Host -> Game. The only host-originated message in this protocol — see
 * the host controller's doc comment for why sending it is the one place `postMessage(..., "*")`
 * (rather than a MessagePort) is used at all. */
export interface HostInitMessage {
  readonly type: "HOST_INIT";
}

export interface GameReadyMessage {
  readonly type: "GAME_READY";
}

export interface GameStartedMessage {
  readonly type: "GAME_STARTED";
}

export interface GameCompleteMessage {
  readonly type: "GAME_COMPLETE";
  readonly score?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface GameCancelMessage {
  readonly type: "GAME_CANCEL";
}

export interface GameErrorMessage {
  readonly type: "GAME_ERROR";
  readonly message?: string;
}

export type GameToHostMessage =
  | GameReadyMessage
  | GameStartedMessage
  | GameCompleteMessage
  | GameCancelMessage
  | GameErrorMessage;

export type GameBridgeMessage = HostInitMessage | GameToHostMessage;

/** A message larger than this is rejected before its fields are even inspected — bounds how much
 * an iframe (untrusted code) can make the host process per message, independent of any one
 * field's own validation. 16KiB is generous for `GAME_COMPLETE`'s `metadata` (a handful of
 * numbers/short strings — see game-slug.tsx-era result screens for what these actually carry)
 * while still being a real bound, not a formality. */
export const GAME_BRIDGE_MAX_PAYLOAD_BYTES = 16 * 1024;

const textEncoder = new TextEncoder();

/** Cheap size check ahead of full validation — a `JSON.stringify` a caller was going to need
 * anyway (to actually send the message), not extra work added just to measure it. Measured in
 * actual UTF-8 bytes (`TextEncoder`, not `.length`): `.length` counts UTF-16 code units, which
 * undercounts anything outside ASCII — 한글 is 3 bytes but 1 code unit, so a `.length`-based
 * check could pass a payload that's meaningfully over the real wire size once it's Korean text
 * or emoji, which is exactly the kind of content a game's own metadata is likely to carry. */
export function isWithinBridgePayloadLimit(data: unknown): boolean {
  try {
    const json = JSON.stringify(data);
    if (typeof json !== "string") return false; // e.g. a bare function/symbol/undefined at the root
    return textEncoder.encode(json).length <= GAME_BRIDGE_MAX_PAYLOAD_BYTES;
  } catch {
    // Circular structures, BigInt, etc. — can't be sent over postMessage as JSON-shaped data
    // anyway, so treat "can't even stringify it" as "too big to accept".
    return false;
  }
}

/** A "plain object" for this protocol's purposes means specifically an object literal (or
 * `Object.create(null)`) — not an array, and not an instance of anything else. `typeof x ===
 * "object"` alone is not enough: `Date`, `Map`, `Set`, `RegExp`, `ArrayBuffer`, and typed arrays
 * are all `typeof "object"` too, and `JSON.stringify` silently reshapes every one of them (a
 * `Date` becomes a string, a `Map`/`ArrayBuffer` becomes `{}`) rather than rejecting them —
 * exactly the "quietly means something different than what was sent" failure this protocol
 * needs to avoid for untrusted iframe input. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

const JSON_SAFE_MAX_DEPTH = 16;

/**
 * Recursively confirms `value` is built only from values `JSON.stringify` represents faithfully
 * — the same values `JSON.parse(JSON.stringify(value))` would round-trip unchanged. Used on
 * `GAME_COMPLETE`'s `metadata`, the one field in this protocol shaped by the game rather than by
 * this file: a `Map`, `Date`, `ArrayBuffer`, or similar nested anywhere inside it must reject the
 * whole message, not get silently reshaped into whatever `JSON.stringify` happens to turn it
 * into. `maxDepth` bounds the recursion against a pathologically deep-but-small structure — a
 * cheap independent guard that doesn't depend on the byte-size check to catch it first.
 */
export function isJsonSafeValue(value: unknown, maxDepth = JSON_SAFE_MAX_DEPTH): boolean {
  if (value === null) return true;
  const type = typeof value;
  if (type === "string" || type === "boolean") return true;
  if (type === "number") return Number.isFinite(value as number);
  if (Array.isArray(value)) {
    if (maxDepth <= 0) return false;
    return value.every((item) => isJsonSafeValue(item, maxDepth - 1));
  }
  if (isPlainObject(value)) {
    if (maxDepth <= 0) return false;
    return Object.values(value).every((item) => isJsonSafeValue(item, maxDepth - 1));
  }
  // undefined, function, symbol, bigint, Date, Map, Set, RegExp, ArrayBuffer, typed arrays, class
  // instances, etc. — anything JSON.stringify would drop or silently reshape.
  return false;
}

/** Validates the one host-originated message. Called by the game-side client when it receives the
 * bootstrap postMessage — see client.ts. Exact shape: an extra field makes this `false`, the same
 * "no smuggled data" posture `parseGameToHostMessage` takes on every game -> host message. */
export function isHostInitMessage(data: unknown): data is HostInitMessage {
  return isPlainObject(data) && Object.keys(data).length === 1 && data.type === "HOST_INIT";
}

/** Validates any message the game may send. Called by the host-side bridge controller for every
 * message received on the MessagePort — see apps/web/app/features/game/runtime/gameBridgeHost.ts.
 * Returns `null` for anything that isn't exactly one of the five known shapes, INCLUDING a
 * structurally-plausible object with an extra/wrong-typed field — a lenient parser here is exactly
 * how an untrusted game could smuggle unexpected data into host state. */
export function parseGameToHostMessage(data: unknown): GameToHostMessage | null {
  if (!isWithinBridgePayloadLimit(data)) return null;
  if (!isPlainObject(data) || typeof data.type !== "string") return null;

  const keys = Object.keys(data);

  switch (data.type) {
    case "GAME_READY":
    case "GAME_STARTED":
    case "GAME_CANCEL":
      return keys.length === 1 ? ({ type: data.type } as GameToHostMessage) : null;

    case "GAME_COMPLETE": {
      if (!keys.every((k) => k === "type" || k === "score" || k === "metadata")) return null;
      if ("score" in data && data.score !== undefined) {
        if (typeof data.score !== "number" || !Number.isFinite(data.score)) return null;
      }
      if ("metadata" in data && data.metadata !== undefined) {
        if (!isPlainObject(data.metadata) || !isJsonSafeValue(data.metadata)) return null;
      }
      return {
        type: "GAME_COMPLETE",
        ...(data.score !== undefined ? { score: data.score as number } : {}),
        ...(data.metadata !== undefined
          ? { metadata: data.metadata as Record<string, unknown> }
          : {}),
      };
    }

    case "GAME_ERROR": {
      if (!keys.every((k) => k === "type" || k === "message")) return null;
      if ("message" in data && data.message !== undefined) {
        if (typeof data.message !== "string" || data.message.length > 500) return null;
      }
      return {
        type: "GAME_ERROR",
        ...(data.message !== undefined ? { message: data.message as string } : {}),
      };
    }

    default:
      return null;
  }
}
