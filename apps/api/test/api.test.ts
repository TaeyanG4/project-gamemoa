import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";

test("GET / returns 200 OK with service info", async () => {
  const res = await app.request("http://localhost/");
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, "ok");
  assert.equal(data.service, "gamemoa-hono-api");
});

test("GET /api/health returns 200 OK with status ok", async () => {
  const res = await app.request("http://localhost/api/health");
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, "ok");
});

test("GET /api/auth/me returns 401 unauthenticated when no session cookie", async () => {
  const res = await app.request("http://localhost/api/auth/me");
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.authenticated, false);
});

test("POST /api/scores rejects invalid payload with 400", async () => {
  const res = await app.request("http://localhost/api/scores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game_id: "reaction-time", score: "not-a-number" }),
  });
  assert.equal(res.status, 400);
});
