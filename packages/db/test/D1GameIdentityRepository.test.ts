import test from "node:test";
import assert from "node:assert/strict";
import { D1GameIdentityRepository, mapSandboxGameIdentityRow } from "../src/index.js";
import { createSqliteD1, SANDBOX_GAMES_TEST_SCHEMA } from "./helpers/sqliteD1.js";

function seedUser(raw: import("node:sqlite").DatabaseSync, id: number, nickname: string) {
  raw
    .prepare(`INSERT INTO users (id, nickname, email, created_at) VALUES (?, ?, ?, ?)`)
    .run(id, nickname, `${nickname}@example.com`, new Date().toISOString());
}

function insertRawGame(
  raw: import("node:sqlite").DatabaseSync,
  row: {
    id?: number;
    slug: string;
    developerUserId: number;
    title?: string;
    shortDescription?: string | null;
    description?: string | null;
    genre?: string;
    mode?: string;
    xpPerCompletion?: number;
    scoreMin?: number | null;
    scoreMax?: number | null;
    visibility?: string;
    liveVersionId?: number | null;
    deletedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
  },
): number {
  const info = raw
    .prepare(
      `INSERT INTO sandbox_games (
        id, slug, developer_user_id, title, short_description, description, genre, mode,
        xp_per_completion, score_min, score_max, visibility, live_version_id, deleted_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.id ?? null,
      row.slug,
      row.developerUserId,
      row.title ?? "Test Game",
      row.shortDescription ?? null,
      row.description ?? null,
      row.genre ?? "puzzle",
      row.mode ?? "single",
      row.xpPerCompletion ?? 100,
      row.scoreMin ?? 0,
      row.scoreMax ?? 1000,
      row.visibility ?? "PRIVATE",
      row.liveVersionId ?? null,
      row.deletedAt ?? null,
      row.createdAt ?? "2026-08-19T10:00:00.000Z",
      row.updatedAt ?? "2026-08-19T10:00:00.000Z",
    );
  return Number(info.lastInsertRowid);
}

test("public surface export: D1GameIdentityRepository and mapSandboxGameIdentityRow exported from index", () => {
  assert.equal(typeof D1GameIdentityRepository, "function");
  assert.equal(typeof mapSandboxGameIdentityRow, "function");
});

test("findById returns active game identity with mapped publisher and runtime fields", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 42, "Dev42");
  const gameId = insertRawGame(raw, {
    slug: "ball-dodge",
    developerUserId: 42,
    visibility: "PRIVATE",
    liveVersionId: null,
    createdAt: "2026-08-19T12:00:00.000Z",
    updatedAt: "2026-08-19T12:30:00.000Z",
  });

  const repo = new D1GameIdentityRepository(db);
  const identity = await repo.findById(gameId);

  assert.ok(identity);
  assert.equal(identity.id, gameId);
  assert.equal(identity.slug, "ball-dodge");
  assert.deepEqual(identity.publisher, { type: "USER", userId: 42 });
  assert.equal(identity.visibility, "PRIVATE");
  assert.equal(identity.liveVersionId, null);
  assert.equal(identity.deletedAt, null);
  assert.equal(identity.createdAt, "2026-08-19T12:00:00.000Z");
  assert.equal(identity.updatedAt, "2026-08-19T12:30:00.000Z");
});

test("findById returns soft-deleted game identity with deletedAt preserved exact as-is", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev1");
  const exactDeletedTimestamp = "2026-08-20T08:00:00.123Z";
  const gameId = insertRawGame(raw, {
    slug: "archived-game",
    developerUserId: 1,
    deletedAt: exactDeletedTimestamp,
  });

  const repo = new D1GameIdentityRepository(db);
  const identity = await repo.findById(gameId);

  assert.ok(identity);
  assert.equal(identity.id, gameId);
  assert.equal(identity.slug, "archived-game");
  assert.equal(identity.deletedAt, exactDeletedTimestamp);
});

test("findById returns null for non-existent game id", async () => {
  const { db } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  const repo = new D1GameIdentityRepository(db);

  const identity = await repo.findById(99999);
  assert.equal(identity, null);
});

test("findBySlug returns active game identity", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 5, "Dev5");
  insertRawGame(raw, {
    slug: "active-runner",
    developerUserId: 5,
    visibility: "PRIVATE",
  });

  const repo = new D1GameIdentityRepository(db);
  const identity = await repo.findBySlug("active-runner");

  assert.ok(identity);
  assert.equal(identity.slug, "active-runner");
  assert.deepEqual(identity.publisher, { type: "USER", userId: 5 });
  assert.equal(identity.deletedAt, null);
});

test("findBySlug returns null for soft-deleted game", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 5, "Dev5");
  insertRawGame(raw, {
    slug: "deleted-runner",
    developerUserId: 5,
    deletedAt: "2026-08-20T09:00:00.000Z",
  });

  const repo = new D1GameIdentityRepository(db);
  const identity = await repo.findBySlug("deleted-runner");

  assert.equal(identity, null);
});

test("findBySlug returns null for non-existent slug", async () => {
  const { db } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  const repo = new D1GameIdentityRepository(db);

  const identity = await repo.findBySlug("does-not-exist");
  assert.equal(identity, null);
});

test("listAll returns only active games and excludes soft-deleted rows", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev1");

  insertRawGame(raw, {
    slug: "game-1",
    developerUserId: 1,
    createdAt: "2026-08-19T01:00:00.000Z",
  });
  insertRawGame(raw, {
    slug: "game-2-deleted",
    developerUserId: 1,
    deletedAt: "2026-08-20T00:00:00.000Z",
    createdAt: "2026-08-19T02:00:00.000Z",
  });
  insertRawGame(raw, {
    slug: "game-3",
    developerUserId: 1,
    createdAt: "2026-08-19T03:00:00.000Z",
  });

  const repo = new D1GameIdentityRepository(db);
  const identities = await repo.listAll();

  assert.equal(identities.length, 2);
  const slugs = identities.map((i) => i.slug);
  assert.deepEqual(slugs, ["game-3", "game-1"]); // ordered created_at DESC
});

test("listAll includes PRIVATE rows as well as PUBLIC rows", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev1");

  insertRawGame(raw, {
    slug: "private-game",
    developerUserId: 1,
    visibility: "PRIVATE",
    createdAt: "2026-08-19T01:00:00.000Z",
  });
  insertRawGame(raw, {
    slug: "public-game",
    developerUserId: 1,
    visibility: "PUBLIC",
    liveVersionId: 10,
    createdAt: "2026-08-19T02:00:00.000Z",
  });

  const repo = new D1GameIdentityRepository(db);
  const identities = await repo.listAll();

  assert.equal(identities.length, 2);
  const visibilityBySlug = Object.fromEntries(identities.map((i) => [i.slug, i.visibility]));
  assert.equal(visibilityBySlug["private-game"], "PRIVATE");
  assert.equal(visibilityBySlug["public-game"], "PUBLIC");
});

test("PUBLIC game with liveVersionId preserves both fields accurately", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 10, "Dev10");

  insertRawGame(raw, {
    slug: "featured-game",
    developerUserId: 10,
    visibility: "PUBLIC",
    liveVersionId: 77,
  });

  const repo = new D1GameIdentityRepository(db);
  const identity = await repo.findBySlug("featured-game");

  assert.ok(identity);
  assert.equal(identity.visibility, "PUBLIC");
  assert.equal(identity.liveVersionId, 77);
});

test("Game with liveVersionId = null preserves null for PRIVATE game", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 10, "Dev10");

  insertRawGame(raw, {
    slug: "draft-game",
    developerUserId: 10,
    visibility: "PRIVATE",
    liveVersionId: null,
  });

  const repo = new D1GameIdentityRepository(db);
  const identity = await repo.findBySlug("draft-game");

  assert.ok(identity);
  assert.equal(identity.liveVersionId, null);
  assert.equal(identity.visibility, "PRIVATE");
});

test("publisher userId matches developer_user_id exactly without displayName derivation", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  // Even if user's nickname is "owogg", publisher must remain USER with developerUserId
  seedUser(raw, 123, "owogg");

  insertRawGame(raw, {
    slug: "user-game-by-owogg-named-user",
    developerUserId: 123,
    visibility: "PRIVATE",
  });

  const repo = new D1GameIdentityRepository(db);
  const identity = await repo.findBySlug("user-game-by-owogg-named-user");

  assert.ok(identity);
  assert.deepEqual(identity.publisher, { type: "USER", userId: 123 });
  assert.notEqual(identity.publisher.type, "OWOGG");
});

test("canonical metadata modifications do not alter GameIdentity projection", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev1");

  const gameId = insertRawGame(raw, {
    slug: "metadata-test",
    developerUserId: 1,
    title: "Original Title",
    shortDescription: "Original Short",
    description: "Original Long",
    genre: "action",
    mode: "single",
    xpPerCompletion: 50,
    scoreMin: 10,
    scoreMax: 999,
  });

  const repo = new D1GameIdentityRepository(db);
  const identityBefore = await repo.findById(gameId);

  // Update canonical metadata in D1 table
  raw
    .prepare(
      `UPDATE sandbox_games SET
        title = 'Changed Title',
        short_description = 'Changed Short',
        description = 'Changed Long',
        genre = 'rpg',
        mode = 'multi',
        xp_per_completion = 500,
        score_min = 0,
        score_max = 50000
       WHERE id = ?`,
    )
    .run(gameId);

  const identityAfter = await repo.findById(gameId);

  assert.ok(identityBefore);
  assert.ok(identityAfter);
  assert.deepEqual(identityBefore, identityAfter);
});

test("mapSandboxGameIdentityRow: fail-closed on malformed row data", () => {
  // Invalid id
  assert.throws(
    () =>
      mapSandboxGameIdentityRow({
        id: "not-a-number",
        slug: "game",
        developer_user_id: 1,
        visibility: "PRIVATE",
        created_at: "2026-08-19",
        updated_at: "2026-08-19",
      }),
    /Invalid or missing game id/,
  );

  assert.throws(
    () =>
      mapSandboxGameIdentityRow({
        id: -1,
        slug: "game",
        developer_user_id: 1,
        visibility: "PRIVATE",
        created_at: "2026-08-19",
        updated_at: "2026-08-19",
      }),
    /Invalid or missing game id/,
  );

  // Padded / whitespace slug rejected without normalization
  assert.throws(
    () =>
      mapSandboxGameIdentityRow({
        id: 1,
        slug: "   ",
        developer_user_id: 1,
        visibility: "PRIVATE",
        created_at: "2026-08-19",
        updated_at: "2026-08-19",
      }),
    /Invalid or malformed game slug/,
  );

  assert.throws(
    () =>
      mapSandboxGameIdentityRow({
        id: 1,
        slug: " padded-slug ",
        developer_user_id: 1,
        visibility: "PRIVATE",
        created_at: "2026-08-19",
        updated_at: "2026-08-19",
      }),
    /Invalid or malformed game slug/,
  );

  assert.throws(
    () =>
      mapSandboxGameIdentityRow({
        id: 1,
        slug: " leading-space",
        developer_user_id: 1,
        visibility: "PRIVATE",
        created_at: "2026-08-19",
        updated_at: "2026-08-19",
      }),
    /Invalid or malformed game slug/,
  );

  assert.throws(
    () =>
      mapSandboxGameIdentityRow({
        id: 1,
        slug: "trailing-space ",
        developer_user_id: 1,
        visibility: "PRIVATE",
        created_at: "2026-08-19",
        updated_at: "2026-08-19",
      }),
    /Invalid or malformed game slug/,
  );


  // Invalid developer_user_id
  assert.throws(
    () =>
      mapSandboxGameIdentityRow({
        id: 1,
        slug: "game",
        developer_user_id: 0,
        visibility: "PRIVATE",
        created_at: "2026-08-19",
        updated_at: "2026-08-19",
      }),
    /Invalid developer_user_id/,
  );

  assert.throws(
    () =>
      mapSandboxGameIdentityRow({
        id: 1,
        slug: "game",
        developer_user_id: -1,
        visibility: "PRIVATE",
        created_at: "2026-08-19",
        updated_at: "2026-08-19",
      }),
    /Invalid developer_user_id/,
  );

  // Invalid visibility
  assert.throws(
    () =>
      mapSandboxGameIdentityRow({
        id: 1,
        slug: "game",
        developer_user_id: 1,
        visibility: "UNKNOWN",
        created_at: "2026-08-19",
        updated_at: "2026-08-19",
      }),
    /Invalid visibility/,
  );

  // Invalid live_version_id
  assert.throws(
    () =>
      mapSandboxGameIdentityRow({
        id: 1,
        slug: "game",
        developer_user_id: 1,
        visibility: "PRIVATE",
        live_version_id: 0,
        created_at: "2026-08-19",
        updated_at: "2026-08-19",
      }),
    /Invalid live_version_id/,
  );

  // PUBLIC game without live_version_id rejected
  assert.throws(
    () =>
      mapSandboxGameIdentityRow({
        id: 1,
        slug: "public-without-version",
        developer_user_id: 1,
        visibility: "PUBLIC",
        live_version_id: null,
        created_at: "2026-08-19",
        updated_at: "2026-08-19",
      }),
    /Invalid runtime state: PUBLIC game "public-without-version" must have a non-null live_version_id/,
  );

  // Malformed deleted_at (number, object, empty string)
  assert.throws(
    () =>
      mapSandboxGameIdentityRow({
        id: 1,
        slug: "game",
        developer_user_id: 1,
        visibility: "PRIVATE",
        deleted_at: 123456789,
        created_at: "2026-08-19",
        updated_at: "2026-08-19",
      }),
    /Invalid deleted_at/,
  );

  assert.throws(
    () =>
      mapSandboxGameIdentityRow({
        id: 1,
        slug: "game",
        developer_user_id: 1,
        visibility: "PRIVATE",
        deleted_at: {},
        created_at: "2026-08-19",
        updated_at: "2026-08-19",
      }),
    /Invalid deleted_at/,
  );

  assert.throws(
    () =>
      mapSandboxGameIdentityRow({
        id: 1,
        slug: "game",
        developer_user_id: 1,
        visibility: "PRIVATE",
        deleted_at: "",
        created_at: "2026-08-19",
        updated_at: "2026-08-19",
      }),
    /Invalid deleted_at/,
  );

  // Missing timestamps
  assert.throws(
    () =>
      mapSandboxGameIdentityRow({
        id: 1,
        slug: "game",
        developer_user_id: 1,
        visibility: "PRIVATE",
        created_at: "",
        updated_at: "2026-08-19",
      }),
    /Missing timestamp/,
  );
});

test("listAll maintains query ordering created_at DESC without alphabetic sort", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev1");

  // Insert games with slugs zzz, aaa, mmm at increasing createdAt timestamps
  insertRawGame(raw, {
    slug: "zzz-game",
    developerUserId: 1,
    createdAt: "2026-08-19T01:00:00.000Z",
  });
  insertRawGame(raw, {
    slug: "aaa-game",
    developerUserId: 1,
    createdAt: "2026-08-19T02:00:00.000Z",
  });
  insertRawGame(raw, {
    slug: "mmm-game",
    developerUserId: 1,
    createdAt: "2026-08-19T03:00:00.000Z",
  });

  const repo = new D1GameIdentityRepository(db);
  const identities = await repo.listAll();

  // Newest first
  assert.deepEqual(
    identities.map((i) => i.slug),
    ["mmm-game", "aaa-game", "zzz-game"],
  );
});
