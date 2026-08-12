import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";
import {
  AuthMeResponseSchema,
  PersonalBestResponseSchema,
  LeaderboardResponseSchema,
} from "@gamemoa/contracts";

test("GET / returns 200 OK with service info", async () => {
  const res = await app.request("http://localhost/");
  assert.equal(res.status, 200);
  const data = (await res.json()) as { status: string; service: string };
  assert.equal(data.status, "ok");
  assert.equal(data.service, "gamemoa-hono-api");
});

test("GET /api/health returns 200 OK with status ok", async () => {
  const res = await app.request("http://localhost/api/health");
  assert.equal(res.status, 200);
  const data = (await res.json()) as { status: string };
  assert.equal(data.status, "ok");
});

test("GET /api/auth/me returns 401 unauthenticated and matches AuthMeResponseSchema", async () => {
  const res = await app.request("http://localhost/api/auth/me");
  assert.equal(res.status, 401);
  const json = await res.json();
  const parsed = AuthMeResponseSchema.safeParse(json);
  assert.ok(parsed.success, "Response matches AuthMeResponseSchema");
  assert.equal(parsed.data.authenticated, false);
});

test("GET /api/auth/providers returns non-secret provider readiness status", async () => {
  const res = await app.request("http://localhost/api/auth/providers");
  assert.equal(res.status, 200);
  const json = (await res.json()) as {
    google: { configured: boolean };
    discord: { configured: boolean };
  };
  assert.equal(typeof json.google.configured, "boolean");
  assert.equal(typeof json.discord.configured, "boolean");
});

test("POST /api/scores rejects foreign origin with 403 Forbidden", async () => {
  const res = await app.request("http://localhost/api/scores", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://malicious-hacker-site.com",
    },
    body: JSON.stringify({ game_id: "reaction-time", score: 250 }),
  });
  assert.equal(res.status, 403);
  const data = (await res.json()) as { error: string };
  assert.match(data.error, /Forbidden/i);
});

test("POST /api/scores returns 401 Unauthorized without valid session cookie", async () => {
  const res = await app.request("http://localhost/api/scores", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ game_id: "reaction-time", score: 250 }),
  });
  assert.equal(res.status, 401);
  const data = (await res.json()) as { error: string };
  assert.equal(data.error, "Unauthorized");
});

test("POST /api/auth/logout succeeds", async () => {
  const res = await app.request("http://localhost/api/auth/logout", {
    method: "POST",
  });
  assert.equal(res.status, 200);
  const data = (await res.json()) as { success: boolean };
  assert.equal(data.success, true);
});

test("GET /api/scores/user/me matches PersonalBestResponseSchema without session", async () => {
  const res = await app.request("http://localhost/api/scores/user/me");
  assert.equal(res.status, 200);
  const json = await res.json();
  const parsed = PersonalBestResponseSchema.safeParse(json);
  assert.ok(parsed.success, "Response matches PersonalBestResponseSchema");
  assert.equal(parsed.data.authenticated, false);
  assert.deepEqual(parsed.data.bests, {});
});

test("GET /api/scores/:gameId matches LeaderboardResponseSchema", async () => {
  const res = await app.request("http://localhost/api/scores/reaction-time");
  assert.equal(res.status, 200);
  const json = await res.json();
  const parsed = LeaderboardResponseSchema.safeParse(json);
  assert.ok(parsed.success, "Response matches LeaderboardResponseSchema");
  assert.equal(parsed.data.game_id || parsed.data.gameId, "reaction-time");
});

test("GET /api/personalization returns 401 unauthenticated without session cookie", async () => {
  const res = await app.request("http://localhost/api/personalization");
  assert.equal(res.status, 401);
  const data = (await res.json()) as { error: string };
  assert.equal(data.error, "Unauthenticated");
});
