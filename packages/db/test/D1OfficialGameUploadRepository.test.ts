import assert from "node:assert/strict";
import test from "node:test";
import type { GameCanonicalDocument } from "@owogg/core";
import { D1OfficialGameUploadRepository } from "../src/index.js";
import { createSqliteD1, SANDBOX_GAMES_TEST_SCHEMA } from "./helpers/sqliteD1.js";

const canonical: GameCanonicalDocument = {
  schemaVersion: 2,
  slug: "admin-game",
  title: "관리자 게임",
  shortDescription: "설명",
  description: "관리자가 게시한 게임",
  publisher: { official: true },
  policy: { score: null, leaderboard: false, xpPerCompletion: 0, requiresAuth: false },
  supportsReplay: false,
  catalog: { type: "GENRE_MODE", genre: "arcade", mode: "single" },
  updatedAt: "2026-08-23T00:00:00.000Z",
};

test("OWOGG admin publication writes only generic games/version/assets and activates READY", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  const repo = new D1OfficialGameUploadRepository(db);
  const nowIso = "2026-08-23T00:00:00.000Z";

  const identity = await repo.ensureOwoggIdentity({ slug: canonical.slug, nowIso });
  assert.ok(identity);
  assert.equal(identity.publisher.type, "OWOGG");
  const version = await repo.createVersion({
    gameId: identity.id,
    objectKey: `uploads/${identity.id}/hash.zip`,
    contentHash: "a".repeat(64),
    bundleBytes: 123,
    nowIso,
  });
  await repo.markPublishing({
    gameId: identity.id,
    versionId: version.id,
    contentHash: version.contentHash,
  });
  await repo.markReady(
    { gameId: identity.id, versionId: version.id, contentHash: version.contentHash },
    {
      publishedAt: nowIso,
      manifestKey: `games/${identity.id}/${version.id}/.owogg-manifest.json`,
      publishedSizeBytes: 99,
      fileCount: 2,
    },
  );
  await repo.upsertLogo({
    gameId: identity.id,
    objectKey: `games/${identity.id}/logo.svg`,
    nowIso,
  });
  await repo.activate({ gameId: identity.id, versionId: version.id, canonical, nowIso });

  const game = raw
    .prepare(
      "SELECT publisher_type, publisher_user_id, visibility, live_version_id, title FROM games WHERE id = ?",
    )
    .get(identity.id) as Record<string, unknown>;
  assert.equal(game.publisher_type, "OWOGG");
  assert.equal(game.publisher_user_id, null);
  assert.equal(game.visibility, "PUBLIC");
  assert.equal(game.live_version_id, version.id);
  assert.equal(game.title, canonical.title);
  assert.equal(raw.prepare("SELECT COUNT(*) AS count FROM sandbox_games").get()?.count, 0);
  assert.equal(
    raw
      .prepare("SELECT object_key FROM game_assets WHERE game_id = ? AND kind = 'LOGO'")
      .get(identity.id)?.object_key,
    `games/${identity.id}/logo.svg`,
  );
});

test("OWOGG admin publication reports a slug already owned by a USER as a conflict", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  raw.prepare("INSERT INTO users (id, nickname) VALUES (1, 'Creator')").run();
  raw
    .prepare(
      `INSERT INTO games
         (slug, publisher_type, publisher_user_id, visibility, live_version_id, created_at, updated_at,
          title, genre, mode)
       VALUES ('admin-game', 'USER', 1, 'PRIVATE', NULL, 'now', 'now', 'User game', 'arcade', 'single')`,
    )
    .run();
  const repo = new D1OfficialGameUploadRepository(db);
  assert.equal(
    await repo.ensureOwoggIdentity({
      slug: "admin-game",
      nowIso: "2026-08-23T00:00:00.000Z",
    }),
    null,
  );
});
