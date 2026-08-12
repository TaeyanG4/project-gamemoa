import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { verifyDiscordSignature } from "../src/infrastructure/discord/signature.js";

function toHex(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString("hex");
}

function makeEd25519KeyPair(): { publicKeyHex: string; privateKey: KeyObject } {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  // Discord publishes its public key as raw 32 bytes (hex). Node's JWK export exposes the
  // raw key material as the base64url `x` field.
  const jwk = publicKey.export({ format: "jwk" }) as { x: string };
  const publicKeyHex = toHex(Buffer.from(jwk.x, "base64url"));
  return { publicKeyHex, privateKey };
}

function signMessage(privateKey: KeyObject, message: string): string {
  // Ed25519 signing in Node's crypto.sign is one-shot (no separate hash algorithm) and
  // produces the raw 64-byte signature Discord's header format expects.
  return toHex(sign(null, Buffer.from(message), privateKey));
}

test("verifyDiscordSignature accepts a validly-signed request", async () => {
  const { publicKeyHex, privateKey } = makeEd25519KeyPair();
  const timestamp = "1700000000";
  const rawBody = JSON.stringify({ type: 1 });
  const signatureHex = signMessage(privateKey, timestamp + rawBody);

  const valid = await verifyDiscordSignature({ publicKeyHex, signatureHex, timestamp, rawBody });
  assert.equal(valid, true);
});

test("verifyDiscordSignature rejects a tampered body", async () => {
  const { publicKeyHex, privateKey } = makeEd25519KeyPair();
  const timestamp = "1700000000";
  const rawBody = JSON.stringify({ type: 1 });
  const signatureHex = signMessage(privateKey, timestamp + rawBody);

  const valid = await verifyDiscordSignature({
    publicKeyHex,
    signatureHex,
    timestamp,
    rawBody: JSON.stringify({ type: 2 }),
  });
  assert.equal(valid, false);
});

test("verifyDiscordSignature rejects a mismatched timestamp", async () => {
  const { publicKeyHex, privateKey } = makeEd25519KeyPair();
  const rawBody = JSON.stringify({ type: 1 });
  const signatureHex = signMessage(privateKey, "1700000000" + rawBody);

  const valid = await verifyDiscordSignature({
    publicKeyHex,
    signatureHex,
    timestamp: "1700000001",
    rawBody,
  });
  assert.equal(valid, false);
});

test("verifyDiscordSignature rejects a signature made by a different key", async () => {
  const { publicKeyHex } = makeEd25519KeyPair();
  const { privateKey: otherPrivateKey } = makeEd25519KeyPair();
  const timestamp = "1700000000";
  const rawBody = JSON.stringify({ type: 1 });
  const signatureHex = signMessage(otherPrivateKey, timestamp + rawBody);

  const valid = await verifyDiscordSignature({ publicKeyHex, signatureHex, timestamp, rawBody });
  assert.equal(valid, false);
});

test("verifyDiscordSignature rejects malformed hex input instead of throwing", async () => {
  const valid = await verifyDiscordSignature({
    publicKeyHex: "not-hex-at-all",
    signatureHex: "also-not-hex",
    timestamp: "1700000000",
    rawBody: "{}",
  });
  assert.equal(valid, false);
});

test("verifyDiscordSignature rejects missing headers", async () => {
  const { publicKeyHex } = makeEd25519KeyPair();
  const valid = await verifyDiscordSignature({
    publicKeyHex,
    signatureHex: undefined,
    timestamp: "1700000000",
    rawBody: "{}",
  });
  assert.equal(valid, false);
});
