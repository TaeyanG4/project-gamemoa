import test from "node:test";
import assert from "node:assert/strict";
import { D1GameDeveloperRepository } from "../src/d1/D1GameDeveloperRepository.js";
import { createSqliteD1, SANDBOX_GAMES_TEST_SCHEMA } from "./helpers/sqliteD1.js";

function seedUser(raw: import("node:sqlite").DatabaseSync, id: number, nickname: string) {
  raw
    .prepare(`INSERT INTO users (id, nickname, email, created_at) VALUES (?, ?, ?, ?)`)
    .run(id, nickname, `${nickname}@example.com`, new Date().toISOString());
}

test("grant creates an ACTIVE row; audit is a separate explicit call (matches AdminAccountRepository's convention, not UserModerationRepository's)", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1GameDeveloperRepository(db);

  const now = new Date().toISOString();
  const record = await repo.grant(1, 99, now);
  assert.equal(record.status, "ACTIVE");
  assert.equal(record.grantedByAdminId, 99);

  const found = await repo.findByUserId(1);
  assert.equal(found?.status, "ACTIVE");

  await repo.appendAudit({ targetUserId: 1, actorAdminId: 99, action: "GRANTED", nowIso: now });
  const audit = await repo.listAudit(1, 10);
  assert.equal(audit.length, 1);
  assert.equal(audit[0]?.action, "GRANTED");
});

test("setStatus flips to REVOKED and back without losing the original grantedByAdminId", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Dev");
  const repo = new D1GameDeveloperRepository(db);

  const now = new Date().toISOString();
  await repo.grant(1, 99, now);
  const revoked = await repo.setStatus(1, "REVOKED", now);
  assert.equal(revoked.status, "REVOKED");
  assert.equal(revoked.grantedByAdminId, 99);

  const reinstated = await repo.setStatus(1, "ACTIVE", now);
  assert.equal(reinstated.status, "ACTIVE");
});

test("list returns every developer regardless of status", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "DevA");
  seedUser(raw, 2, "DevB");
  const repo = new D1GameDeveloperRepository(db);

  const now = new Date().toISOString();
  await repo.grant(1, 99, now);
  await repo.grant(2, 99, now);
  await repo.setStatus(2, "REVOKED", now);

  const all = await repo.list();
  assert.equal(all.length, 2);
});

test("listAudit is scoped per-user and ordered most-recent-first", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "DevA");
  seedUser(raw, 2, "DevB");
  const repo = new D1GameDeveloperRepository(db);

  const now = new Date().toISOString();
  await repo.grant(1, 99, now);
  await repo.grant(2, 99, now);
  await repo.appendAudit({ targetUserId: 1, actorAdminId: 99, action: "GRANTED", nowIso: now });
  await repo.appendAudit({ targetUserId: 1, actorAdminId: 99, action: "REVOKED", nowIso: now });
  await repo.appendAudit({ targetUserId: 2, actorAdminId: 99, action: "GRANTED", nowIso: now });

  const auditA = await repo.listAudit(1, 10);
  assert.equal(auditA.length, 2);
  assert.equal(auditA[0]?.action, "REVOKED");

  const auditB = await repo.listAudit(2, 10);
  assert.equal(auditB.length, 1);
});
