import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";

test("GET /api/creators/rankings returns 200 and structure", async () => {
  const mockEnv = {
    DB: {
      prepare() {
        return {
          bind() {
            return this;
          },
          async first() {
            return { total: 0 };
          },
          async all() {
            return { results: [] };
          },
        };
      },
    },
  };

  const res = await app.request(
    "/api/creators/rankings?mode=score&platform=YOUTUBE",
    {},
    mockEnv as any,
  );
  assert.equal(res.status, 200);

  const json = (await res.json()) as any;
  assert.equal(Array.isArray(json.entries), true);
  assert.equal(json.mode, "score");
  assert.equal(json.platform, "YOUTUBE");
});

test("GET /api/creators/me requires authentication", async () => {
  const mockEnv = { DB: {} };
  const res = await app.request("/api/creators/me", {}, mockEnv as any);
  assert.equal(res.status, 401);
});
