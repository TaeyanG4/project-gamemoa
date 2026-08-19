import test from "node:test";
import assert from "node:assert/strict";
import {
  signGameSession,
  verifyGameSession,
  gameSessionMatches,
  GAME_SESSION_POLICY,
  type GameSessionPayload,
} from "../src/domain/gameSession.js";
import { tamperBase64UrlSegment } from "./helpers/tamperSignature.js";

const SECRET = "test-secret-do-not-use-in-prod";

function samplePayload(overrides: Partial<GameSessionPayload> = {}): GameSessionPayload {
  return {
    userId: 1,
    gameId: 42,
    versionId: 7,
    attemptId: "11111111-1111-1111-1111-111111111111",
    exp: Math.floor(Date.now() / 1000) + GAME_SESSION_POLICY.EXPIRY_SECONDS,
    ...overrides,
  };
}

// ── round trip ─────────────────────────────────────────────────────────────

test("a token signed with a secret verifies successfully with the same secret, payload intact", async () => {
  const payload = samplePayload();
  const token = await signGameSession(payload, SECRET);
  const result = await verifyGameSession(token, SECRET);
  assert.equal(result.ok, true);
  assert.deepEqual(result.ok ? result.payload : null, payload);
});

test("the token has the expected gs1.<payload>.<signature> shape", async () => {
  const token = await signGameSession(samplePayload(), SECRET);
  const parts = token.split(".");
  assert.equal(parts.length, 3);
  assert.equal(parts[0], "gs1");
});

// ── tamper ─────────────────────────────────────────────────────────────────

test("tampering with the payload segment invalidates the signature", async () => {
  const token = await signGameSession(samplePayload(), SECRET);
  const [version, payload, signature] = token.split(".");
  // Flip a character in the payload — still valid base64url, still valid JSON shape most likely
  // (this specific mutation may or may not stay parseable JSON, but either way it must fail).
  const tamperedPayload = payload === "AAAA" ? "AAAB" : payload!.slice(0, -1) + "A";
  const tampered = `${version}.${tamperedPayload}.${signature}`;

  const result = await verifyGameSession(tampered, SECRET);
  assert.equal(result.ok, false);
});

test("tampering with the signature segment is rejected as a bad signature", async () => {
  const token = await signGameSession(samplePayload(), SECRET);
  const [version, payload, signature] = token.split(".");
  const tamperedSignature = tamperBase64UrlSegment(signature!);
  const tampered = `${version}.${payload}.${tamperedSignature}`;

  const result = await verifyGameSession(tampered, SECRET);
  assert.equal(result.ok, false);
  assert.equal(result.ok ? null : result.error, "BAD_SIGNATURE");
});

test("a token signed with a different secret is rejected", async () => {
  const token = await signGameSession(samplePayload(), SECRET);
  const result = await verifyGameSession(token, "a-completely-different-secret");
  assert.equal(result.ok, false);
  assert.equal(result.ok ? null : result.error, "BAD_SIGNATURE");
});

// ── expired ────────────────────────────────────────────────────────────────

test("a token past its exp is rejected as expired, even with a valid signature", async () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = samplePayload({ exp: nowSeconds - 1 });
  const token = await signGameSession(payload, SECRET);

  const result = await verifyGameSession(token, SECRET, nowSeconds);
  assert.equal(result.ok, false);
  assert.equal(result.ok ? null : result.error, "EXPIRED");
});

test("a token exactly at its exp second is treated as already expired (exp is exclusive)", async () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = samplePayload({ exp: nowSeconds });
  const token = await signGameSession(payload, SECRET);

  const result = await verifyGameSession(token, SECRET, nowSeconds);
  assert.equal(result.ok, false);
  assert.equal(result.ok ? null : result.error, "EXPIRED");
});

test("a token one second before its exp is still valid", async () => {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = samplePayload({ exp: nowSeconds + 1 });
  const token = await signGameSession(payload, SECRET);

  const result = await verifyGameSession(token, SECRET, nowSeconds);
  assert.equal(result.ok, true);
});

// ── malformed ──────────────────────────────────────────────────────────────

test("garbage input never throws, always resolves to MALFORMED", async () => {
  for (const bad of [
    "",
    "not-a-token",
    "gs1.only-two-parts",
    "wrong-version.a.b",
    "gs1..",
    "a.b.c.d",
  ]) {
    await assert.doesNotReject(async () => {
      const result = await verifyGameSession(bad, SECRET);
      assert.equal(result.ok, false);
    });
  }
});

// ── gameSessionMatches: wrong-user / wrong-game / wrong-version ────────────

test("gameSessionMatches accepts a payload matching every expected field", () => {
  const payload = samplePayload({ userId: 1, gameId: 42, versionId: 7 });
  assert.equal(gameSessionMatches(payload, { userId: 1, gameId: 42, versionId: 7 }), true);
});

test("gameSessionMatches rejects a wrong userId — a valid token replayed by a different logged-in user", () => {
  const payload = samplePayload({ userId: 1, gameId: 42, versionId: 7 });
  assert.equal(gameSessionMatches(payload, { userId: 2, gameId: 42, versionId: 7 }), false);
});

test("gameSessionMatches rejects a wrong gameId — a token issued for a different game", () => {
  const payload = samplePayload({ userId: 1, gameId: 42, versionId: 7 });
  assert.equal(gameSessionMatches(payload, { userId: 1, gameId: 99, versionId: 7 }), false);
});

test("gameSessionMatches rejects a wrong versionId — the live version moved on since issuance", () => {
  const payload = samplePayload({ userId: 1, gameId: 42, versionId: 7 });
  assert.equal(gameSessionMatches(payload, { userId: 1, gameId: 42, versionId: 8 }), false);
});
