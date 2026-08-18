import test from "node:test";
import assert from "node:assert/strict";
import { D1SandboxGameRepository } from "../src/d1/D1SandboxGameRepository.js";
import { createSqliteD1, SANDBOX_GAMES_TEST_SCHEMA } from "./helpers/sqliteD1.js";

function seedUser(raw: import("node:sqlite").DatabaseSync, id: number, nickname: string) {
  raw
    .prepare(`INSERT INTO users (id, nickname, email, created_at) VALUES (?, ?, ?, ?)`)
    .run(id, nickname, `${nickname}@example.com`, new Date().toISOString());
}

async function seedGame(repo: D1SandboxGameRepository, slug = "test-game", developerUserId = 1) {
  const created = await repo.create({
    slug,
    developerUserId,
    title: "Test Game",
    shortDescription: "short",
    description: "long",
    genre: "puzzle",
    nowIso: new Date().toISOString(),
  });
  if (!created) throw new Error(`seedGame(${slug}) unexpectedly hit the review-slot limit`);
  return created;
}

test("create + findBySlug/findById round-trip, visibility defaults to PRIVATE", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);

  const created = await seedGame(repo);
  assert.equal(created.visibility, "PRIVATE");
  assert.equal(created.liveVersionId, null);
  assert.equal(created.xpPerCompletion, 0);

  const bySlug = await repo.findBySlug("test-game");
  assert.equal(bySlug?.id, created.id);
  const byId = await repo.findById(created.id);
  assert.equal(byId?.slug, "test-game");
});

test("the DB CHECK constraint rejects PUBLIC visibility with no live_version_id", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const game = await seedGame(repo);

  await assert.rejects(() => repo.setVisibility(game.id, "PUBLIC", new Date().toISOString()));
});

test("createVersion then decideVersion(APPROVED) + setLiveVersion lets visibility go PUBLIC", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const game = await seedGame(repo);

  const now = new Date().toISOString();
  const version = await repo.createVersion({
    gameId: game.id,
    objectKey: "sandbox-games/test-game/abc.zip",
    contentHash: "abc",
    bundleBytes: 1024,
    nowIso: now,
  });
  assert.equal(version.status, "PENDING_REVIEW");

  const decided = await repo.decideVersion(version.id, "APPROVED", 99, null, now);
  assert.equal(decided.status, "APPROVED");
  assert.equal(decided.reviewedByAdminId, 99);

  const withLiveVersion = await repo.setLiveVersion(game.id, version.id, now);
  assert.equal(withLiveVersion.liveVersionId, version.id);

  const published = await repo.setVisibility(game.id, "PUBLIC", now);
  assert.equal(published.visibility, "PUBLIC");
});

test("decideVersion(REJECTED) records the reason and never sets live_version_id", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const game = await seedGame(repo);

  const now = new Date().toISOString();
  const version = await repo.createVersion({
    gameId: game.id,
    objectKey: "k",
    contentHash: "h",
    bundleBytes: 10,
    nowIso: now,
  });
  const decided = await repo.decideVersion(version.id, "REJECTED", 99, "malware", now);
  assert.equal(decided.status, "REJECTED");
  assert.equal(decided.rejectReason, "malware");

  const game2 = await repo.findById(game.id);
  assert.equal(game2?.liveVersionId, null);
});

test("re-upload keeps the previously-approved version live while the new one is pending", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const game = await seedGame(repo);
  const now = new Date().toISOString();

  const v1 = await repo.createVersion({
    gameId: game.id,
    objectKey: "k1",
    contentHash: "h1",
    bundleBytes: 10,
    nowIso: now,
  });
  await repo.decideVersion(v1.id, "APPROVED", 99, null, now);
  await repo.setLiveVersion(game.id, v1.id, now);

  const v2 = await repo.createVersion({
    gameId: game.id,
    objectKey: "k2",
    contentHash: "h2",
    bundleBytes: 20,
    nowIso: now,
  });

  const current = await repo.findById(game.id);
  assert.equal(current?.liveVersionId, v1.id, "live version must not move until v2 is decided");

  const pending = await repo.listPendingVersions(20, 0);
  assert.deepEqual(
    pending.versions.map((v) => v.id),
    [v2.id],
  );
});

test("listPendingVersions is oldest-first and paginates with a total count", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const g1 = await seedGame(repo, "game-1");
  const g2 = await seedGame(repo, "game-2");

  await repo.createVersion({
    gameId: g1.id,
    objectKey: "a",
    contentHash: "a",
    bundleBytes: 1,
    nowIso: "2026-01-01T00:00:00.000Z",
  });
  await repo.createVersion({
    gameId: g2.id,
    objectKey: "b",
    contentHash: "b",
    bundleBytes: 1,
    nowIso: "2026-01-02T00:00:00.000Z",
  });

  const page = await repo.listPendingVersions(1, 0);
  assert.equal(page.total, 2);
  assert.equal(page.versions.length, 1);
  assert.equal(page.versions[0]?.gameId, g1.id);
});

test("updateMetadata only touches the fields provided, leaves the rest untouched", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const game = await seedGame(repo);

  const updated = await repo.updateMetadata(
    game.id,
    { xpPerCompletion: 50, scoreDirection: "desc" },
    new Date().toISOString(),
  );
  assert.equal(updated.xpPerCompletion, 50);
  assert.equal(updated.scoreDirection, "desc");
  assert.equal(updated.title, "Test Game", "untouched fields must survive a partial update");
  assert.equal(updated.genre, "puzzle");
});

test("appendReviewAudit + listReviewAudit round-trips metadata JSON and orders most-recent-first", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const game = await seedGame(repo);
  const now = new Date().toISOString();

  await repo.appendReviewAudit({
    gameId: game.id,
    versionId: null,
    actorAdminId: 99,
    action: "METADATA_CHANGED",
    reason: null,
    metadata: { xpPerCompletion: 50 },
    nowIso: now,
  });
  await repo.appendReviewAudit({
    gameId: game.id,
    versionId: null,
    actorAdminId: 99,
    action: "VISIBILITY_CHANGED",
    reason: null,
    metadata: { visibility: "PUBLIC" },
    nowIso: now,
  });

  const audit = await repo.listReviewAudit(game.id, 10);
  assert.equal(audit.length, 2);
  assert.equal(audit[0]?.action, "VISIBILITY_CHANGED");
  assert.deepEqual(audit[1]?.metadata, { xpPerCompletion: 50 });
});

test("listByDeveloper and listPublic scope correctly", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "DevA");
  const repo = new D1SandboxGameRepository(db);
  const now = new Date().toISOString();

  const mine = await seedGame(repo, "mine");
  const alsoMine = await seedGame(repo, "also-mine");
  assert.deepEqual(
    (await repo.listByDeveloper(1)).map((g) => g.id).sort(),
    [mine.id, alsoMine.id].sort(),
  );

  assert.deepEqual(await repo.listPublic(), []);

  const version = await repo.createVersion({
    gameId: mine.id,
    objectKey: "k",
    contentHash: "h",
    bundleBytes: 1,
    nowIso: now,
  });
  await repo.decideVersion(version.id, "APPROVED", 99, null, now);
  await repo.setLiveVersion(mine.id, version.id, now);
  await repo.setVisibility(mine.id, "PUBLIC", now);

  const publicGames = await repo.listPublic();
  assert.equal(publicGames.length, 1);
  assert.equal(publicGames[0]?.id, mine.id);
});

test("softDelete sets deleted_at/deleted_by_admin_id and forces visibility back to PRIVATE", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const now = new Date().toISOString();

  const game = await seedGame(repo);
  const version = await repo.createVersion({
    gameId: game.id,
    objectKey: "k",
    contentHash: "h",
    bundleBytes: 1,
    nowIso: now,
  });
  await repo.decideVersion(version.id, "APPROVED", 99, null, now);
  await repo.setLiveVersion(game.id, version.id, now);
  await repo.setVisibility(game.id, "PUBLIC", now);

  const deleted = await repo.softDelete(game.id, 99, now);
  assert.equal(deleted.deletedAt, now);
  assert.equal(deleted.deletedByAdminId, 99);
  assert.equal(deleted.visibility, "PRIVATE");

  const reread = await repo.findById(game.id);
  assert.equal(reread?.deletedAt, now);
  assert.equal(reread?.visibility, "PRIVATE");
});

test("a soft-deleted game is excluded from findBySlug (the /play/:slug lookup path)", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const now = new Date().toISOString();

  const game = await seedGame(repo, "vanishing-game");
  assert.notEqual(await repo.findBySlug("vanishing-game"), null);

  await repo.softDelete(game.id, 99, now);
  assert.equal(await repo.findBySlug("vanishing-game"), null);
  // findById stays available — admin tooling and audit trails still need to look it up by id.
  assert.notEqual(await repo.findById(game.id), null);
});

test("a soft-deleted game is excluded from listPublic even if it was PUBLIC beforehand", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const now = new Date().toISOString();

  const game = await seedGame(repo, "public-then-deleted");
  const version = await repo.createVersion({
    gameId: game.id,
    objectKey: "k",
    contentHash: "h",
    bundleBytes: 1,
    nowIso: now,
  });
  await repo.decideVersion(version.id, "APPROVED", 99, null, now);
  await repo.setLiveVersion(game.id, version.id, now);
  await repo.setVisibility(game.id, "PUBLIC", now);
  assert.equal((await repo.listPublic()).length, 1);

  await repo.softDelete(game.id, 99, now);
  assert.equal((await repo.listPublic()).length, 0);
});

test("a soft-deleted game stays visible to its own developer via listByDeveloper", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const now = new Date().toISOString();

  const game = await seedGame(repo, "deleted-but-mine");
  await repo.softDelete(game.id, 99, now);

  const mine = await repo.listByDeveloper(1);
  assert.equal(mine.length, 1);
  assert.equal(mine[0]?.id, game.id);
  assert.notEqual(mine[0]?.deletedAt, null);
});

test("a new game defaults to deleted_at/deleted_by_admin_id both null", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const game = await seedGame(repo);
  assert.equal(game.deletedAt, null);
  assert.equal(game.deletedByAdminId, null);
});

test("a new version starts UPLOADED on the publish axis, independent of its review status", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const game = await seedGame(repo);
  const now = new Date().toISOString();

  const version = await repo.createVersion({
    gameId: game.id,
    objectKey: `uploads/${game.id}/abc.zip`,
    contentHash: "abc",
    bundleBytes: 1024,
    nowIso: now,
  });

  assert.equal(version.status, "PENDING_REVIEW");
  assert.equal(version.publishStatus, "UPLOADED");
  assert.equal(version.publishError, null);
  assert.equal(version.publishedAt, null);
  assert.equal(version.manifestKey, null);
  assert.equal(version.publishedSizeBytes, null);
  assert.equal(version.fileCount, null);
});

test("setVersionPublishState round-trips a READY transition and then a FAILED one", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const game = await seedGame(repo);
  const now = new Date().toISOString();
  const version = await repo.createVersion({
    gameId: game.id,
    objectKey: `uploads/${game.id}/abc.zip`,
    contentHash: "abc",
    bundleBytes: 1024,
    nowIso: now,
  });

  const ready = await repo.setVersionPublishState(version.id, {
    publishStatus: "READY",
    publishError: null,
    publishedAt: now,
    manifestKey: `games/${game.id}/${version.id}/.owogg-manifest.json`,
    publishedSizeBytes: 4096,
    fileCount: 7,
  });
  assert.equal(ready.publishStatus, "READY");
  assert.equal(ready.publishedAt, now);
  assert.equal(ready.manifestKey, `games/${game.id}/${version.id}/.owogg-manifest.json`);
  assert.equal(ready.publishedSizeBytes, 4096);
  assert.equal(ready.fileCount, 7);
  // The review axis is untouched by a publish transition.
  assert.equal(ready.status, "PENDING_REVIEW");

  // A later failure must clear the success fields rather than leave a stale manifest pointer.
  const failed = await repo.setVersionPublishState(version.id, {
    publishStatus: "FAILED",
    publishError: "simulated storage failure",
    publishedAt: null,
    manifestKey: null,
    publishedSizeBytes: null,
    fileCount: null,
  });
  assert.equal(failed.publishStatus, "FAILED");
  assert.equal(failed.publishError, "simulated storage failure");
  assert.equal(failed.manifestKey, null);
  assert.equal(failed.publishedSizeBytes, null);
  assert.equal(failed.fileCount, null);
});

// ── review-slot quota (beta concurrent-submission cap) ───────────────────────

test("create claims slot 1, then slot 2, for a developer's first two games", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);

  const g1 = await seedGame(repo, "game-1");
  const g2 = await seedGame(repo, "game-2");

  assert.equal(g1.reviewSlot, 1);
  assert.equal(g2.reviewSlot, 2);
});

test("a third concurrent submission is refused (returns null) while both slots are held", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);

  await repo.create({
    slug: "game-1",
    developerUserId: 1,
    title: "Game 1",
    shortDescription: null,
    description: null,
    genre: "puzzle",
    nowIso: new Date().toISOString(),
  });
  await repo.create({
    slug: "game-2",
    developerUserId: 1,
    title: "Game 2",
    shortDescription: null,
    description: null,
    genre: "puzzle",
    nowIso: new Date().toISOString(),
  });

  const third = await repo.create({
    slug: "game-3",
    developerUserId: 1,
    title: "Game 3",
    shortDescription: null,
    description: null,
    genre: "puzzle",
    nowIso: new Date().toISOString(),
  });

  assert.equal(third, null);
  // Crucially, the refused submission must not have been created at all — not created-without-a-slot.
  assert.equal(await repo.findBySlug("game-3"), null);
});

test("concurrent create calls for the same developer never claim more than 2 slots (real race, not simulated)", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);

  // Five concurrent submissions fired at once — D1's single serialized query queue (see
  // middleware/edgeCache.ts's note on docs/DATABASE.md §4) means these interleave at the
  // statement level exactly like concurrent HTTP requests would in production, which is the
  // scenario the INSERT ... SELECT / UNIQUE INDEX pairing exists to make safe.
  const results = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      repo.create({
        slug: `race-game-${i}`,
        developerUserId: 1,
        title: `Race Game ${i}`,
        shortDescription: null,
        description: null,
        genre: "puzzle",
        nowIso: new Date().toISOString(),
      }),
    ),
  );

  const succeeded = results.filter((r) => r !== null);
  assert.equal(succeeded.length, 2, "exactly 2 of 5 concurrent submissions may succeed");
  assert.deepEqual(succeeded.map((g) => g!.reviewSlot).sort(), [1, 2]);

  const allGames = await repo.listByDeveloper(1);
  assert.equal(allGames.length, 2, "the 3 refused submissions must not exist as rows at all");
});

test("the UNIQUE INDEX itself rejects a second row claiming an already-held slot, independent of app logic", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  await seedGame(repo, "game-1"); // claims slot 1

  // Bypass the repository entirely and try to insert a second row with the same
  // (developer_user_id, review_slot) directly via raw SQL — this is the actual DB invariant, not
  // the application code's cooperation with it.
  assert.throws(() => {
    raw
      .prepare(
        `INSERT INTO sandbox_games
           (slug, developer_user_id, title, genre, review_slot, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "raw-insert-game",
        1,
        "Raw",
        "puzzle",
        1,
        new Date().toISOString(),
        new Date().toISOString(),
      );
  }, /UNIQUE constraint failed/);
});

test("different developers each get their own independent 2-slot budget", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "DevA");
  seedUser(raw, 2, "DevB");
  const repo = new D1SandboxGameRepository(db);

  await seedGame(repo, "a1", 1);
  await seedGame(repo, "a2", 1);
  // DevA is now at their limit — DevB is unaffected.
  const b1 = await seedGame(repo, "b1", 2);
  assert.equal(b1.reviewSlot, 1);

  const aThird = await repo.create({
    slug: "a3",
    developerUserId: 1,
    title: "A3",
    shortDescription: null,
    description: null,
    genre: "puzzle",
    nowIso: new Date().toISOString(),
  });
  assert.equal(aThird, null);
});

test("releaseReviewSlot frees the slot for reuse by a later submission", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const g1 = await seedGame(repo, "game-1");
  await seedGame(repo, "game-2");
  const now = new Date().toISOString();

  const released = await repo.releaseReviewSlot(g1.id, now);
  assert.equal(released.reviewSlot, null);

  const g3 = await seedGame(repo, "game-3");
  assert.equal(
    g3.reviewSlot,
    1,
    "the freed slot 1 is reused, not appended as a 3rd concurrent slot",
  );
});

test("releaseReviewSlot is idempotent — releasing an already-released slot is a harmless no-op", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const g1 = await seedGame(repo, "game-1");
  const now = new Date().toISOString();

  await repo.releaseReviewSlot(g1.id, now);
  const releasedAgain = await repo.releaseReviewSlot(g1.id, now);
  assert.equal(releasedAgain.reviewSlot, null);
});

// ── withdrawal ─────────────────────────────────────────────────────────────

test("withdrawVersion marks a PENDING_REVIEW version WITHDRAWN", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const game = await seedGame(repo);
  const version = await repo.createVersion({
    gameId: game.id,
    objectKey: "k",
    contentHash: "h",
    bundleBytes: 1,
    nowIso: new Date().toISOString(),
  });

  const withdrawn = await repo.withdrawVersion(version.id);
  assert.equal(withdrawn.status, "WITHDRAWN");
  assert.equal(withdrawn.reviewedByAdminId, null, "nobody reviewed a self-withdrawn submission");
});

test("withdrawVersion is a no-op on a version that has already been decided", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const game = await seedGame(repo);
  const now = new Date().toISOString();
  const version = await repo.createVersion({
    gameId: game.id,
    objectKey: "k",
    contentHash: "h",
    bundleBytes: 1,
    nowIso: now,
  });
  await repo.decideVersion(version.id, "APPROVED", 99, null, now);

  const result = await repo.withdrawVersion(version.id);
  assert.equal(result.status, "APPROVED", "an already-decided version must not be overwritten");
});

test("concurrent createVersion calls each get back their own row, never another call's (RETURNING, not last_insert_rowid)", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1SandboxGameRepository(db);
  const game = await seedGame(repo);

  const results = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      repo.createVersion({
        gameId: game.id,
        objectKey: `k-${i}`,
        contentHash: `hash-${i}`,
        bundleBytes: i,
        nowIso: new Date().toISOString(),
      }),
    ),
  );

  // Each of the 5 concurrent calls must see its own distinct objectKey/contentHash back — a
  // `last_insert_rowid()`-based read-back could instead let two calls both report the same
  // (most-recently-written) row.
  assert.deepEqual(results.map((r) => r.objectKey).sort(), ["k-0", "k-1", "k-2", "k-3", "k-4"]);
  assert.equal(new Set(results.map((r) => r.id)).size, 5, "every call must get a distinct row id");
});
