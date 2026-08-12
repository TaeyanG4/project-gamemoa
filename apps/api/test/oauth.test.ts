import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDiscordAuthorizeUrl,
  exchangeDiscordCode,
} from "../src/infrastructure/oauth/discord.js";
import { verifyGoogleToken } from "../src/infrastructure/oauth/google.ts";

test("buildDiscordAuthorizeUrl constructs correct Discord OAuth URL", () => {
  const url = buildDiscordAuthorizeUrl({
    clientId: "12345",
    redirectUri: "http://localhost/api/auth/discord/callback",
    state: "random-csrf-token",
  });

  assert.ok(url.startsWith("https://discord.com/api/oauth2/authorize"));
  assert.ok(url.includes("client_id=12345"));
  assert.ok(url.includes("response_type=code"));
  assert.ok(url.includes("scope=identify+email"));
  assert.ok(url.includes("state=random-csrf-token"));
});

test("verifyGoogleToken handles fetch errors gracefully", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => {
      return new Response("Invalid Token", { status: 400 });
    }) as unknown as typeof fetch;

    const res = await verifyGoogleToken("invalid-google-token");
    assert.equal(res.valid, false);
    assert.equal(res.reason, "Invalid Google token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("exchangeDiscordCode handles token exchange failure gracefully", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => {
      return new Response("Unauthorized", { status: 401 });
    }) as unknown as typeof fetch;

    const res = await exchangeDiscordCode({
      code: "bad-code",
      clientId: "client-id",
      clientSecret: "client-secret",
      redirectUri: "http://localhost/callback",
    });

    assert.equal(res.valid, false);
    assert.equal(res.reason, "Failed to exchange code for token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
