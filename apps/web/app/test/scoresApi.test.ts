import test from "node:test";
import assert from "node:assert/strict";
import { fetchLeaderboardApi } from "../features/scores/api";
import { API_URL } from "../lib/api/config";

/**
 * fetchLeaderboardApi used to resolve each row's display title itself, importing
 * a second client-side game metadata lookup
 * see apps/api/src/routes/scores.ts's matching change). The server now resolves `gameTitle`
 * once per request through the same RuntimeGameRegistry the leaderboard query itself used, so this file
 * only has to pass it through — these tests pin exactly that: no second request is made, and the
 * server's value (not a client-side lookup) is what ends up on each row.
 */

function stubFetchOnce(body: unknown): { calls: string[]; restore: () => void } {
  const original = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(typeof input === "string" ? input : input.toString());
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

test("fetchLeaderboardApi passes through the server-provided gameTitle without a second request", async () => {
  const stub = stubFetchOnce({
    game_id: "reaction-time",
    leaderboard: [
      {
        id: 1,
        nickname: "Fast",
        score: 150,
        gameId: "reaction-time",
        gameTitle: "반응속도 테스트",
      },
    ],
  });
  try {
    const records = await fetchLeaderboardApi("reaction-time");
    assert.equal(records[0]?.gameTitle, "반응속도 테스트");
    assert.equal(stub.calls.length, 1, "exactly one request — no follow-up lookup");
    assert.ok(stub.calls[0]?.startsWith(`${API_URL}/api/scores/`));
  } finally {
    stub.restore();
  }
});

test("fetchLeaderboardApi falls back to the row's gameId when gameTitle is absent", async () => {
  const stub = stubFetchOnce({
    game_id: "unlisted-game",
    leaderboard: [{ id: 1, nickname: "Someone", score: 10, gameId: "unlisted-game" }],
  });
  try {
    const records = await fetchLeaderboardApi("unlisted-game");
    assert.equal(records[0]?.gameTitle, "unlisted-game");
  } finally {
    stub.restore();
  }
});
