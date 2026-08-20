import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  D1GameVersionRepository,
  D1SandboxGameRepository,
  mapGameVersionRow,
} from "../src/index.js";
import {
  createSqliteD1,
  LEGACY_SANDBOX_GAMES_TEST_SCHEMA,
  SANDBOX_GAMES_TEST_SCHEMA,
} from "./helpers/sqliteD1.js";

const migration0029 = fs.readFileSync(
  new URL("../migrations/0029_unified_game_identity.sql", import.meta.url),
  "utf8",
);
const migration0030 = fs.readFileSync(
  new URL("../migrations/0030_user_identity_write_convergence.sql", import.meta.url),
  "utf8",
);
const migration0031 = fs.readFileSync(
  new URL("../migrations/0031_game_version_write_convergence.sql", import.meta.url),
  "utf8",
);

function seedUser(raw: import("node:sqlite").DatabaseSync, id: number): void {
  raw.prepare("INSERT INTO users (id, nickname) VALUES (?, ?)").run(id, `User ${id}`);
}

function seedSandboxGame(
  raw: import("node:sqlite").DatabaseSync,
  input: { id: number; slug: string; userId: number; liveVersionId?: number | null },
): void {
  raw
    .prepare(
      `INSERT INTO sandbox_games (
         id, slug, developer_user_id, title, genre, visibility, live_version_id,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, 'arcade', ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.slug,
      input.userId,
      input.slug,
      input.liveVersionId == null ? "PRIVATE" : "PUBLIC",
      input.liveVersionId ?? null,
      "2026-08-20T00:00:00.000Z",
      "2026-08-20T00:00:00.000Z",
    );
}

function seedSandboxVersion(
  raw: import("node:sqlite").DatabaseSync,
  input: {
    id: number;
    gameId: number;
    publishStatus?: "UPLOADED" | "PUBLISHING" | "READY" | "FAILED";
    publishError?: string | null;
    reviewStatus?: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "WITHDRAWN";
    reviewedAt?: string | null;
  },
): void {
  const ready = input.publishStatus === "READY";
  raw
    .prepare(
      `INSERT INTO sandbox_game_versions (
         id, game_id, object_key, content_hash, bundle_bytes, status, reviewed_at, uploaded_at,
         publish_status, publish_error, published_at, manifest_key, published_size_bytes, file_count
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.gameId,
      `uploads/${input.gameId}/${input.id}.zip`,
      `hash-${input.id}`,
      input.id * 10,
      input.reviewStatus ?? "PENDING_REVIEW",
      input.reviewedAt ?? null,
      `2026-08-20T00:00:${String(input.id).padStart(2, "0")}.000Z`,
      input.publishStatus ?? "UPLOADED",
      input.publishError ?? null,
      ready ? "2026-08-20T01:00:00.000Z" : null,
      ready ? `games/${input.gameId}/${input.id}/manifest.json` : null,
      ready ? input.id * 20 : null,
      ready ? 3 : null,
    );
}

function applyIdentityFoundation(raw: import("node:sqlite").DatabaseSync): void {
  raw.exec(migration0029);
  raw.exec(migration0030);
}

test("0031 actual migration preserves USER version IDs and publish facts without review fields", async () => {
  const { db, raw } = createSqliteD1(LEGACY_SANDBOX_GAMES_TEST_SCHEMA);
  raw.exec("PRAGMA foreign_keys = ON;");
  seedUser(raw, 1);
  seedSandboxGame(raw, { id: 10, slug: "versioned-game", userId: 1, liveVersionId: 8 });
  seedSandboxVersion(raw, { id: 5, gameId: 10, publishStatus: "UPLOADED" });
  seedSandboxVersion(raw, { id: 8, gameId: 10, publishStatus: "READY" });
  seedSandboxVersion(raw, {
    id: 12,
    gameId: 10,
    publishStatus: "FAILED",
    publishError: "publish failed",
  });
  seedSandboxVersion(raw, { id: 13, gameId: 10, publishStatus: "PUBLISHING" });

  applyIdentityFoundation(raw);

  // Old Worker deployment-gap writes after identity convergence but before A-4.
  seedSandboxVersion(raw, { id: 15, gameId: 10, publishStatus: "PUBLISHING" });
  raw
    .prepare(
      "UPDATE sandbox_game_versions SET publish_error = 'gap failure', publish_status = 'FAILED' WHERE id = 15",
    )
    .run();

  raw.exec(migration0031);
  assert.equal(
    raw
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_migration_0031_parity_guard'",
      )
      .get(),
    undefined,
    "successful 0031 migration must remove its scratch parity guard",
  );
  const repo = new D1GameVersionRepository(db);
  const versions = await repo.listByGameId(10);

  assert.deepEqual(
    versions.map((version) => version.id).sort((a, b) => a - b),
    [5, 8, 12, 13, 15],
  );
  assert.equal((await repo.findById(8))?.publishStatus, "READY");
  assert.equal((await repo.findById(8))?.manifestKey, "games/10/8/manifest.json");
  assert.equal((await repo.findById(12))?.publishError, "publish failed");
  assert.equal((await repo.findById(13))?.publishStatus, "PUBLISHING");
  assert.equal((await repo.findById(15))?.publishError, "gap failure");
  assert.equal((await repo.findForGame(10, 8))?.id, 8);
  assert.equal(await repo.findForGame(999, 8), null);

  const columns = raw.prepare("PRAGMA table_info(game_versions)").all() as Array<{ name: string }>;
  const names = new Set(columns.map((column) => column.name));
  for (const forbidden of [
    "status",
    "reviewed_by_admin_id",
    "reviewed_at",
    "reject_reason",
    "review_slot",
    "developer_user_id",
  ]) {
    assert.equal(names.has(forbidden), false, `${forbidden} must remain USER-workflow-only`);
  }
});

test("0031 backfills permanent slug reservations from current approval and historical audit", () => {
  const { raw } = createSqliteD1(LEGACY_SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1);
  seedSandboxGame(raw, { id: 1, slug: "currently-approved", userId: 1 });
  seedSandboxGame(raw, { id: 2, slug: "historically-approved", userId: 1 });
  seedSandboxGame(raw, { id: 3, slug: "never-approved", userId: 1 });
  seedSandboxVersion(raw, {
    id: 1,
    gameId: 1,
    reviewStatus: "APPROVED",
    reviewedAt: "2026-08-20T02:00:00.000Z",
  });
  seedSandboxVersion(raw, { id: 2, gameId: 2, reviewStatus: "PENDING_REVIEW" });
  seedSandboxVersion(raw, { id: 3, gameId: 3, reviewStatus: "PENDING_REVIEW" });
  raw
    .prepare(
      `INSERT INTO sandbox_game_review_audit_log
         (game_id, version_id, actor_admin_id, action, reason, metadata_json, created_at)
       VALUES (2, 2, 9, 'VERSION_APPROVED', NULL, NULL, '2026-08-20T01:00:00.000Z'),
              (1, 1, 9, 'VERSION_APPROVED', NULL, NULL, '2026-08-20T03:00:00.000Z')`,
    )
    .run();

  applyIdentityFoundation(raw);
  raw.exec(migration0031);

  const reservations = raw
    .prepare(
      `SELECT slug, source_game_id, reserved_at
       FROM game_slug_reservations ORDER BY source_game_id`,
    )
    .all() as Array<{ slug: string; source_game_id: number; reserved_at: string }>;
  assert.deepEqual(
    reservations.map((reservation) => ({ ...reservation })),
    [
      {
        slug: "currently-approved",
        source_game_id: 1,
        reserved_at: "2026-08-20T02:00:00.000Z",
      },
      {
        slug: "historically-approved",
        source_game_id: 2,
        reserved_at: "2026-08-20T01:00:00.000Z",
      },
    ],
  );
});

test("0031 triggers converge old-worker INSERT/UPDATE/DELETE and preserve soft-deleted history", async () => {
  const { db, raw } = createSqliteD1(LEGACY_SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1);
  seedSandboxGame(raw, { id: 1, slug: "gap-game", userId: 1 });
  applyIdentityFoundation(raw);
  raw.exec(migration0031);

  seedSandboxVersion(raw, { id: 40, gameId: 1, publishStatus: "UPLOADED" });
  const repo = new D1GameVersionRepository(db);
  assert.equal((await repo.findById(40))?.publishStatus, "UPLOADED");

  raw
    .prepare(
      `UPDATE sandbox_game_versions
       SET publish_status = 'READY', published_at = '2026-08-21T00:00:00.000Z',
           manifest_key = 'games/1/40/manifest.json', published_size_bytes = 123, file_count = 2
       WHERE id = 40`,
    )
    .run();
  assert.equal((await repo.findById(40))?.publishStatus, "READY");
  assert.equal((await repo.findById(40))?.fileCount, 2);

  raw
    .prepare(
      "UPDATE sandbox_games SET deleted_at = '2026-08-21T01:00:00.000Z', visibility = 'PRIVATE' WHERE id = 1",
    )
    .run();
  assert.ok(await repo.findById(40), "soft delete must retain historical generic versions");

  raw.prepare("DELETE FROM sandbox_game_versions WHERE id = 40").run();
  assert.equal(await repo.findById(40), null);
});

test("new USER versions allocate after future OWOGG versions and keep exact IDs in both tables", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1);
  const sandboxRepo = new D1SandboxGameRepository(db);
  const game = await sandboxRepo.create({
    slug: "shared-version-game",
    developerUserId: 1,
    title: "Shared",
    shortDescription: null,
    description: null,
    genre: "arcade",
    mode: "single",
    nowIso: "2026-08-21T00:00:00.000Z",
  });
  assert.ok(game);

  raw
    .prepare(
      `INSERT INTO games (
         id, slug, publisher_type, publisher_user_id, visibility, live_version_id, created_at, updated_at
       ) VALUES (100, 'official-future', 'OWOGG', NULL, 'PRIVATE', NULL, ?, ?)`,
    )
    .run("2026-08-21T00:00:00.000Z", "2026-08-21T00:00:00.000Z");
  raw
    .prepare(
      `INSERT INTO game_versions (
         id, game_id, object_key, content_hash, bundle_bytes, publish_status, uploaded_at
       ) VALUES (500, 100, 'official.zip', 'official-hash', 10, 'READY', ?)`,
    )
    .run("2026-08-21T00:00:00.000Z");

  const version = await sandboxRepo.createVersion({
    gameId: game.id,
    objectKey: "uploads/user.zip",
    contentHash: "user-hash",
    bundleBytes: 20,
    nowIso: "2026-08-21T00:01:00.000Z",
  });
  assert.ok(version.id > 500);

  const generic = raw.prepare("SELECT * FROM game_versions WHERE id = ?").get(version.id) as {
    game_id: number;
  };
  const legacy = raw
    .prepare("SELECT * FROM sandbox_game_versions WHERE id = ?")
    .get(version.id) as {
    game_id: number;
  };
  assert.equal(Number(generic.game_id), game.id);
  assert.equal(Number(legacy.game_id), game.id);
});

test("shared allocator rolls back generic insert when USER workflow insert fails", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  raw
    .prepare(
      `INSERT INTO games (
         id, slug, publisher_type, publisher_user_id, visibility, live_version_id, created_at, updated_at
       ) VALUES (100, 'official-only', 'OWOGG', NULL, 'PRIVATE', NULL, ?, ?)`,
    )
    .run("2026-08-21T00:00:00.000Z", "2026-08-21T00:00:00.000Z");
  const before = Number(
    (raw.prepare("SELECT COUNT(*) AS count FROM game_versions").get() as { count: number }).count,
  );

  const repo = new D1SandboxGameRepository(db);
  await assert.rejects(() =>
    repo.createVersion({
      gameId: 100,
      objectKey: "official-invalid.zip",
      contentHash: "official-invalid",
      bundleBytes: 10,
      nowIso: "2026-08-21T00:01:00.000Z",
    }),
  );
  const after = Number(
    (raw.prepare("SELECT COUNT(*) AS count FROM game_versions").get() as { count: number }).count,
  );
  assert.equal(after, before);
});

test("live version guard rejects a version owned by another game", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1);
  const repo = new D1SandboxGameRepository(db);
  const first = await repo.create({
    slug: "first-game",
    developerUserId: 1,
    title: "First",
    shortDescription: null,
    description: null,
    genre: "arcade",
    mode: "single",
    nowIso: "2026-08-21T00:00:00.000Z",
  });
  const second = await repo.create({
    slug: "second-game",
    developerUserId: 1,
    title: "Second",
    shortDescription: null,
    description: null,
    genre: "arcade",
    mode: "single",
    nowIso: "2026-08-21T00:00:01.000Z",
  });
  assert.ok(first);
  assert.ok(second);
  const version = await repo.createVersion({
    gameId: second.id,
    objectKey: "uploads/second.zip",
    contentHash: "second-hash",
    bundleBytes: 10,
    nowIso: "2026-08-21T00:01:00.000Z",
  });

  await assert.rejects(() => repo.setLiveVersion(first.id, version.id, "2026-08-21T00:02:00.000Z"));
  assert.equal(
    (
      raw.prepare("SELECT live_version_id FROM games WHERE id = ?").get(first.id) as {
        live_version_id: number | null;
      }
    ).live_version_id,
    null,
  );
});

test("0031 parity guard fails closed when live_version_id belongs to another game", () => {
  const { raw } = createSqliteD1(LEGACY_SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1);
  seedSandboxGame(raw, { id: 1, slug: "game-one", userId: 1, liveVersionId: 20 });
  seedSandboxGame(raw, { id: 2, slug: "game-two", userId: 1 });
  seedSandboxVersion(raw, { id: 20, gameId: 2, publishStatus: "READY" });
  applyIdentityFoundation(raw);

  assert.throws(() => raw.exec(migration0031), /CHECK constraint failed: must_be_zero = 0/);
});

test("0031 parity guard refuses USER versions whose generic game authority was tampered", () => {
  const { raw } = createSqliteD1(LEGACY_SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1);
  seedSandboxGame(raw, { id: 1, slug: "authority-game", userId: 1 });
  seedSandboxVersion(raw, { id: 1, gameId: 1 });
  applyIdentityFoundation(raw);
  raw
    .prepare("UPDATE games SET publisher_type = 'OWOGG', publisher_user_id = NULL WHERE id = 1")
    .run();

  assert.throws(() => raw.exec(migration0031), /CHECK constraint failed: must_be_zero = 0/);
});

test("mapGameVersionRow fails closed on malformed generic data", () => {
  const valid = {
    id: 1,
    game_id: 2,
    object_key: "uploads/2/1.zip",
    content_hash: "hash",
    bundle_bytes: 10,
    publish_status: "UPLOADED",
    publish_error: null,
    published_at: null,
    manifest_key: null,
    published_size_bytes: null,
    file_count: null,
    uploaded_at: "2026-08-21T00:00:00.000Z",
  };

  assert.equal(mapGameVersionRow(valid).id, 1);
  assert.throws(() => mapGameVersionRow({ ...valid, id: "1" }), /Invalid id/);
  assert.throws(
    () => mapGameVersionRow({ ...valid, publish_status: "APPROVED" }),
    /Invalid publish_status/,
  );
  assert.throws(() => mapGameVersionRow({ ...valid, bundle_bytes: -1 }), /Invalid bundle_bytes/);
  for (const field of [
    "publish_error",
    "published_at",
    "manifest_key",
    "published_size_bytes",
    "file_count",
  ]) {
    const missing: Record<string, unknown> = { ...valid };
    delete missing[field];
    assert.throws(
      () => mapGameVersionRow(missing),
      new RegExp(`Invalid ${field}`),
      `${field}: missing must not normalize to SQL NULL`,
    );
  }
});
