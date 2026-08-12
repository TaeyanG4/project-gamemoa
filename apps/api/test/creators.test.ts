import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";

function createMockDb(sessionUser?: { id: number; nickname: string }) {
  return {
    prepare() {
      return {
        bind() {
          return {
            async first() {
              if (sessionUser) {
                return {
                  id: "valid_session",
                  user_id: sessionUser.id,
                  expires_at: new Date(Date.now() + 86400000).toISOString(),
                  created_at: new Date().toISOString(),
                  nickname: sessionUser.nickname,
                  avatar_url: null,
                };
              }
              return null;
            },
            async all() {
              return { results: [] };
            },
            async run() {
              return { success: true };
            },
          };
        },
        async first() {
          return { total: 0 };
        },
        async all() {
          return { results: [] };
        },
      };
    },
  };
}

test("GET /api/creators/rankings returns 200 and structure", async () => {
  const mockEnv = {
    DB: createMockDb(),
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
  const mockEnv = { DB: createMockDb() };
  const res = await app.request("/api/creators/me", {}, mockEnv as any);
  assert.equal(res.status, 401);
});

test("GET /api/creators/providers returns configuration status for all platforms", async () => {
  const mockEnv = {
    DB: createMockDb(),
    YOUTUBE_CLIENT_ID: "yt-client-id",
    YOUTUBE_CLIENT_SECRET: "yt-secret",
  };

  const res = await app.request("/api/creators/providers", {}, mockEnv as any);
  assert.equal(res.status, 200);

  const json = (await res.json()) as any;
  assert.equal(json.YOUTUBE.configured, true);
  assert.equal(json.TWITCH.configured, false);
  assert.equal(json.CHZZK.configured, false);
  assert.equal(json.SOOP.configured, false);
});

test("GET /api/creators/verify/:platform returns unconfigured error when provider missing", async () => {
  const mockEnv = {
    DB: createMockDb({ id: 1, nickname: "Tester" }),
    FRONTEND_URL: "http://localhost:3000",
  };

  const res = await app.request(
    "/api/creators/verify/youtube",
    {
      headers: { Cookie: "gamemoa_session=valid_session" },
    },
    mockEnv as any,
  );

  assert.equal(res.status, 302);
  const location = res.headers.get("location");
  assert.ok(location?.includes("creator_verify=unconfigured"));
});

test("GET /api/creators/verify/:platform initiates OAuth redirect when provider configured with mock", async () => {
  const mockEnv = {
    DB: createMockDb({ id: 1, nickname: "Tester" }),
    USE_MOCK_CREATOR_PROVIDERS: "true",
  };

  const res = await app.request(
    "/api/creators/verify/youtube",
    {
      headers: { Cookie: "gamemoa_session=valid_session" },
    },
    mockEnv as any,
  );

  assert.equal(res.status, 302);
  const location = res.headers.get("location");
  assert.ok(location?.includes("https://mock.gamemoa.dev/auth/YOUTUBE"));
  assert.ok(location?.includes("state="));

  const setCookie = res.headers.get("set-cookie");
  assert.ok(setCookie?.includes("creator_verify_state="));
});

test("GET /api/creators/verify/:platform/callback rejects state mismatch", async () => {
  const mockEnv = {
    DB: createMockDb(),
    FRONTEND_URL: "http://localhost:3000",
  };

  const res = await app.request(
    "/api/creators/verify/youtube/callback?code=abc&state=badstate",
    {},
    mockEnv as any,
  );

  assert.equal(res.status, 302);
  const location = res.headers.get("location");
  assert.ok(location?.includes("creator_verify=error"));
  assert.ok(location?.includes("state_mismatch"));
});
