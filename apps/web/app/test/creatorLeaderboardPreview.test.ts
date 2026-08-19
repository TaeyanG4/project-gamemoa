import test from "node:test";
import assert from "node:assert/strict";
import { fetchCreatorLeaderboardPreview } from "../features/game/creatorLeaderboardPreview";
import type { LeaderRecord } from "@owogg/contracts";

// fetchCreatorLeaderboardPreview is the pure, framework-free piece behind CreatorGameHost's
// leaderboard-preview effect (see that module's own doc comment). This file covers the two things
// actually worth pinning: it slices to the top 5, and a failed fetch resolves to an empty array
// rather than throwing (leaderboard fetch failures must stay non-fatal to the result screen).

function makeRecord(overrides: Partial<LeaderRecord> = {}): LeaderRecord {
  return {
    id: "1",
    playerName: "player",
    gameId: "ball-dodge",
    gameTitle: "공 피하기",
    score: 4.4,
    formattedScore: "4.4초",
    grade: undefined,
    createdAt: new Date().toISOString(),
    avatarUrl: null,
    userId: 1,
    difficulty: "normal",
    ...overrides,
  };
}

test("returns only the top 5 entries, even when the API returns more", async () => {
  const records = Array.from({ length: 20 }, (_, i) => makeRecord({ id: String(i), userId: i }));
  const result = await fetchCreatorLeaderboardPreview("ball-dodge", async () => records);

  assert.equal(result.length, 5);
  assert.deepEqual(
    result.map((r) => r.id),
    ["0", "1", "2", "3", "4"],
  );
});

test("never re-sorts — the API's own ordering (asc/desc per the game's policy) is trusted as-is", async () => {
  const records = [
    makeRecord({ id: "a", score: 12.75 }),
    makeRecord({ id: "b", score: 4.4 }),
    makeRecord({ id: "c", score: 1.1 }),
  ];
  const result = await fetchCreatorLeaderboardPreview("ball-dodge", async () => records);

  assert.deepEqual(
    result.map((r) => r.id),
    ["a", "b", "c"],
  );
});

test("fewer than 5 records returns exactly what's there, no padding", async () => {
  const records = [makeRecord()];
  const result = await fetchCreatorLeaderboardPreview("ball-dodge", async () => records);
  assert.equal(result.length, 1);
});

test("a failed fetch resolves to an empty array instead of throwing", async () => {
  const result = await fetchCreatorLeaderboardPreview("ball-dodge", async () => {
    throw new Error("network error");
  });
  assert.deepEqual(result, []);
});

test("passes the slug through to the injected fetch function unchanged", async () => {
  let receivedSlug: string | undefined;
  await fetchCreatorLeaderboardPreview("ball-dodge", async (slug) => {
    receivedSlug = slug;
    return [];
  });
  assert.equal(receivedSlug, "ball-dodge");
});
