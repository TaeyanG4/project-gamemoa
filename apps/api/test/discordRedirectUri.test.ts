import test from "node:test";
import assert from "node:assert/strict";
import type { Context } from "hono";
import { getDiscordRedirectUri, type ApiEnv } from "../src/routes/auth.js";

function fakeContext(env: Partial<ApiEnv["Bindings"]>, url: string): Context<ApiEnv> {
  return { env, req: { url } } as unknown as Context<ApiEnv>;
}

// Regression test for the "잘못된 OAuth2 redirect_uri" bug: the LOGIN flow (GET
// /api/auth/discord) and the LINK flow (GET /api/auth/link/discord) must send Discord the
// exact same redirect_uri, since Discord's Developer Portal only has one registered. They
// used to diverge (link built its own /api/auth/link/discord/callback path), which Discord
// rejected outright for any account whose first login was Google.
test("getDiscordRedirectUri returns the configured DISCORD_REDIRECT_URI regardless of request path", () => {
  const env = {
    DISCORD_REDIRECT_URI: "https://gamemoa-api.gamemoa.workers.dev/api/auth/discord/callback",
  };

  const loginUri = getDiscordRedirectUri(
    fakeContext(env, "https://gamemoa-api.gamemoa.workers.dev/api/auth/discord"),
  );
  const linkUri = getDiscordRedirectUri(
    fakeContext(env, "https://gamemoa-api.gamemoa.workers.dev/api/auth/link/discord"),
  );

  assert.equal(loginUri, linkUri);
  assert.equal(loginUri, "https://gamemoa-api.gamemoa.workers.dev/api/auth/discord/callback");
});

test("getDiscordRedirectUri falls back to the request origin + /api/auth/discord/callback when unconfigured", () => {
  const env = {};

  const loginUri = getDiscordRedirectUri(
    fakeContext(env, "http://localhost:8787/api/auth/discord"),
  );
  const linkUri = getDiscordRedirectUri(
    fakeContext(env, "http://localhost:8787/api/auth/link/discord"),
  );

  assert.equal(loginUri, linkUri);
  assert.equal(loginUri, "http://localhost:8787/api/auth/discord/callback");
});
