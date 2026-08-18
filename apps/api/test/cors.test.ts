import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/index.js";

// Regression coverage for the 2026-08-18 production bug: the app-level cors() middleware's
// allowMethods list was missing "PATCH", so every PATCH route in the API (admin sandbox-game
// visibility/metadata, admin account role/permission edits, Discord guild settings, profile
// nickname/country) failed the browser's CORS preflight and surfaced as an opaque "Failed to
// fetch" — never reaching the server at all, so no server-side test using app.request() directly
// against a PATCH route (bypassing the browser's preflight enforcement entirely) could have caught
// it. This test instead sends the actual OPTIONS preflight request a browser sends before a
// cross-origin PATCH, and asserts the response's Access-Control-Allow-Methods header — the only
// place this class of bug is actually observable.
test("CORS preflight (OPTIONS) advertises PATCH in Access-Control-Allow-Methods", async () => {
  const res = await app.request(
    "/api/admin/sandbox-games/1/visibility",
    {
      method: "OPTIONS",
      headers: {
        Origin: "https://owogg.com",
        "Access-Control-Request-Method": "PATCH",
        "Access-Control-Request-Headers": "Content-Type",
      },
    },
    { FRONTEND_URL: "https://owogg.com" } as any,
  );
  assert.equal(res.status, 204);
  const allowed = res.headers.get("Access-Control-Allow-Methods") ?? "";
  assert.ok(
    allowed.includes("PATCH"),
    `expected PATCH in Access-Control-Allow-Methods, got "${allowed}"`,
  );
});

test("CORS preflight still advertises the other standard methods (no regression on the fix)", async () => {
  const res = await app.request(
    "/api/admin/sandbox-games/1",
    {
      method: "OPTIONS",
      headers: {
        Origin: "https://owogg.com",
        "Access-Control-Request-Method": "DELETE",
      },
    },
    { FRONTEND_URL: "https://owogg.com" } as any,
  );
  const allowed = res.headers.get("Access-Control-Allow-Methods") ?? "";
  for (const method of ["GET", "POST", "PUT", "DELETE", "OPTIONS"]) {
    assert.ok(allowed.includes(method), `expected ${method} in Access-Control-Allow-Methods`);
  }
});
