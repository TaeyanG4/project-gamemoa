import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";

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

test("GET /api/auth/me returns 401 unauthenticated when no session cookie", async () => {
  const res = await app.request("http://localhost/api/auth/me");
  assert.equal(res.status, 401);
  const data = (await res.json()) as { authenticated: boolean };
  assert.equal(data.authenticated, false);
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

test("POST /api/scores accepts allowed origin or missing origin (for same-domain apps)", async () => {
  const res = await app.request("http://localhost/api/scores", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:5173",
    },
    body: JSON.stringify({ game_id: "reaction-time", score: "invalid-string" }),
  });
  // Origin accepted, payload rejected with 400 Bad Request
  assert.equal(res.status, 400);
});

test("POST /api/scores rejects invalid score type with 400", async () => {
  const res = await app.request("http://localhost/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: "reaction-time", score: "not-a-number" }),
  });
  assert.equal(res.status, 400);
  const data = (await res.json()) as { error: string };
  assert.equal(data.error, "Invalid payload");
});

test("POST /api/auth/logout succeeds", async () => {
  const res = await app.request("http://localhost/api/auth/logout", {
    method: "POST",
  });
  assert.equal(res.status, 200);
  const data = (await res.json()) as { success: boolean };
  assert.equal(data.success, true);
});

test("GET /api/scores/user/me returns unauthenticated status without session", async () => {
  const res = await app.request("http://localhost/api/scores/user/me");
  assert.equal(res.status, 200);
  const data = (await res.json()) as { authenticated: boolean; bests: Record<string, number> };
  assert.equal(data.authenticated, false);
  assert.deepEqual(data.bests, {});
});
