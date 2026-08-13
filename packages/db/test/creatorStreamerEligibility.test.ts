import test from "node:test";
import assert from "node:assert/strict";
import { D1CreatorRepository } from "../src/d1/D1CreatorRepository.js";
import { createSqliteD1, LEADERBOARD_TEST_SCHEMA } from "./helpers/sqliteD1.js";

// Streamer ranking eligibility rule (WORK_PROGRESS Phase B): a OwOGG user qualifies for the
// streamer/Creator ranking once they have AT LEAST ONE ownership-VERIFIED account on ANY
// supported platform (YOUTUBE, CHZZK, SOOP, TWITCH) — not all four, and never on
// creator_profiles.status alone (which could in principle drift from the real per-platform
// verification state).

function seedUser(raw: import("node:sqlite").DatabaseSync, nickname: string): number {
  const info = raw
    .prepare(
      `INSERT INTO users (nickname, created_at, updated_at) VALUES (?, datetime('now'), datetime('now'))`,
    )
    .run(nickname);
  return Number(info.lastInsertRowid);
}

/** Creates a creator_profiles row with the given `status` (defaults to VERIFIED) and zero
 * platform accounts — the caller adds accounts separately via `addPlatformAccount`. */
function seedCreatorProfile(
  raw: import("node:sqlite").DatabaseSync,
  userId: number,
  status: "VERIFIED" | "UNVERIFIED" = "VERIFIED",
): number {
  const now = new Date().toISOString();
  const info = raw
    .prepare(
      `INSERT INTO creator_profiles (user_id, status, featured_status, created_at, updated_at)
       VALUES (?, ?, 'NONE', ?, ?)`,
    )
    .run(userId, status, now, now);
  return Number(info.lastInsertRowid);
}

function addPlatformAccount(
  raw: import("node:sqlite").DatabaseSync,
  creatorId: number,
  platform: string,
  platformUserId: string,
  verificationStatus: "VERIFIED" | "PENDING" | "UNVERIFIED" = "VERIFIED",
): void {
  const now = new Date().toISOString();
  raw
    .prepare(
      `INSERT INTO creator_platform_accounts
         (creator_id, platform, platform_user_id, channel_name, channel_url, verification_status, created_at, updated_at)
       VALUES (?, ?, ?, 'ch', ?, ?, ?, ?)`,
    )
    .run(
      creatorId,
      platform,
      platformUserId,
      `https://example.com/${platform}`,
      verificationStatus,
      now,
      now,
    );
}

function seedScore(raw: import("node:sqlite").DatabaseSync, userId: number, score: number): void {
  raw
    .prepare(
      `INSERT INTO scores (user_id, nickname, game_id, score, created_at) VALUES (?, 'p', 'reaction-time', ?, datetime('now'))`,
    )
    .run(userId, score);
}

function seedXp(raw: import("node:sqlite").DatabaseSync, userId: number, totalXp: number): void {
  raw
    .prepare(
      `INSERT INTO user_progress (user_id, total_xp, eligible_completions, updated_at) VALUES (?, ?, 0, datetime('now'))`,
    )
    .run(userId, totalXp);
}

for (const platform of ["YOUTUBE", "CHZZK", "SOOP", "TWITCH"] as const) {
  test(`streamer ranking (score mode): ${platform}-only verified is included`, async () => {
    const { db, raw } = createSqliteD1(LEADERBOARD_TEST_SCHEMA);
    const userId = seedUser(raw, "solo");
    const creatorId = seedCreatorProfile(raw, userId);
    addPlatformAccount(raw, creatorId, platform, "id-1", "VERIFIED");
    seedScore(raw, userId, 500);

    const repo = new D1CreatorRepository(db);
    const result = await repo.getCreatorRankings({ mode: "score", gameId: "reaction-time" });
    assert.equal(result.total, 1);
    assert.equal(result.entries[0]?.userId, userId);
  });
}

test("streamer ranking (score mode): all four platforms verified still produces exactly one row", async () => {
  const { db, raw } = createSqliteD1(LEADERBOARD_TEST_SCHEMA);
  const userId = seedUser(raw, "multi");
  const creatorId = seedCreatorProfile(raw, userId);
  addPlatformAccount(raw, creatorId, "YOUTUBE", "yt-1", "VERIFIED");
  addPlatformAccount(raw, creatorId, "CHZZK", "cz-1", "VERIFIED");
  addPlatformAccount(raw, creatorId, "SOOP", "sp-1", "VERIFIED");
  addPlatformAccount(raw, creatorId, "TWITCH", "tw-1", "VERIFIED");
  seedScore(raw, userId, 800);

  const repo = new D1CreatorRepository(db);
  const result = await repo.getCreatorRankings({ mode: "score", gameId: "reaction-time" });
  assert.equal(result.total, 1);
  assert.equal(result.entries.length, 1);
  assert.equal(result.entries[0]?.platformAccounts.length, 4);
});

test("streamer ranking (score mode): zero verified platforms excludes the creator even with a score", async () => {
  const { db, raw } = createSqliteD1(LEADERBOARD_TEST_SCHEMA);
  const userId = seedUser(raw, "nobody");
  seedCreatorProfile(raw, userId, "UNVERIFIED");
  seedScore(raw, userId, 900);

  const repo = new D1CreatorRepository(db);
  const result = await repo.getCreatorRankings({ mode: "score", gameId: "reaction-time" });
  assert.equal(result.total, 0);
  assert.equal(result.entries.length, 0);
});

test("streamer ranking (score mode): creator_profiles.status=VERIFIED but zero VERIFIED platform accounts is still excluded (stale-status defense)", async () => {
  const { db, raw } = createSqliteD1(LEADERBOARD_TEST_SCHEMA);
  const userId = seedUser(raw, "stale");
  // Profile says VERIFIED, but the only platform account is still PENDING — this must never be
  // trusted on its own.
  const creatorId = seedCreatorProfile(raw, userId, "VERIFIED");
  addPlatformAccount(raw, creatorId, "YOUTUBE", "yt-pending", "PENDING");
  seedScore(raw, userId, 1000);

  const repo = new D1CreatorRepository(db);
  const result = await repo.getCreatorRankings({ mode: "score", gameId: "reaction-time" });
  assert.equal(result.total, 0);
  assert.equal(result.entries.length, 0);
});

test("streamer ranking: one verified + one pending account exposes only the verified platform badge", async () => {
  const { db, raw } = createSqliteD1(LEADERBOARD_TEST_SCHEMA);
  const userId = seedUser(raw, "partial");
  const creatorId = seedCreatorProfile(raw, userId);
  addPlatformAccount(raw, creatorId, "YOUTUBE", "yt-1", "VERIFIED");
  addPlatformAccount(raw, creatorId, "TWITCH", "tw-pending", "PENDING");
  seedScore(raw, userId, 600);

  const repo = new D1CreatorRepository(db);
  const result = await repo.getCreatorRankings({ mode: "score", gameId: "reaction-time" });
  assert.equal(result.total, 1);
  assert.deepEqual(
    result.entries[0]?.platformAccounts.map((a) => a.platform),
    ["YOUTUBE"],
  );
});

test("streamer ranking: platform filters are mutually exclusive and never duplicate a multi-platform creator", async () => {
  const { db, raw } = createSqliteD1(LEADERBOARD_TEST_SCHEMA);
  const userId = seedUser(raw, "yt-and-twitch");
  const creatorId = seedCreatorProfile(raw, userId);
  addPlatformAccount(raw, creatorId, "YOUTUBE", "yt-1", "VERIFIED");
  addPlatformAccount(raw, creatorId, "TWITCH", "tw-1", "VERIFIED");
  seedScore(raw, userId, 700);

  const repo = new D1CreatorRepository(db);
  const all = await repo.getCreatorRankings({ mode: "score", gameId: "reaction-time" });
  const yt = await repo.getCreatorRankings({
    mode: "score",
    gameId: "reaction-time",
    platform: "YOUTUBE",
  });
  const twitch = await repo.getCreatorRankings({
    mode: "score",
    gameId: "reaction-time",
    platform: "TWITCH",
  });
  const chzzk = await repo.getCreatorRankings({
    mode: "score",
    gameId: "reaction-time",
    platform: "CHZZK",
  });

  assert.equal(all.total, 1, "appears exactly once under ALL");
  assert.equal(yt.total, 1, "appears once under YOUTUBE");
  assert.equal(twitch.total, 1, "appears once under TWITCH");
  assert.equal(chzzk.total, 0, "does not appear under an unverified platform");
});

test("streamer ranking (xp mode): same eligibility rule applies — zero verified platforms excluded, one verified included", async () => {
  const { db, raw } = createSqliteD1(LEADERBOARD_TEST_SCHEMA);
  const eligibleUser = seedUser(raw, "eligible");
  const eligibleCreatorId = seedCreatorProfile(raw, eligibleUser);
  addPlatformAccount(raw, eligibleCreatorId, "CHZZK", "cz-1", "VERIFIED");
  seedXp(raw, eligibleUser, 5000);

  const ineligibleUser = seedUser(raw, "ineligible");
  seedCreatorProfile(raw, ineligibleUser, "UNVERIFIED");
  seedXp(raw, ineligibleUser, 9000); // higher XP but not a verified streamer

  const repo = new D1CreatorRepository(db);
  const result = await repo.getCreatorRankings({ mode: "xp" });
  assert.equal(result.total, 1);
  assert.equal(result.entries[0]?.userId, eligibleUser);
});

test("streamer ranking: Featured status does not affect score/XP ranking value or eligibility", async () => {
  const { db, raw } = createSqliteD1(LEADERBOARD_TEST_SCHEMA);
  const userId = seedUser(raw, "featured");
  const creatorId = seedCreatorProfile(raw, userId);
  addPlatformAccount(raw, creatorId, "YOUTUBE", "yt-1", "VERIFIED");
  raw
    .prepare(`UPDATE creator_profiles SET featured_status = 'FEATURED' WHERE id = ?`)
    .run(creatorId);
  seedScore(raw, userId, 321);

  const repo = new D1CreatorRepository(db);
  const result = await repo.getCreatorRankings({ mode: "score", gameId: "reaction-time" });
  assert.equal(result.entries[0]?.score, 321, "Featured never boosts the ranked value");
});
