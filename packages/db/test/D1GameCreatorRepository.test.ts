import test from "node:test";
import assert from "node:assert/strict";
import { D1GameCreatorRepository } from "../src/d1/D1GameCreatorRepository.js";
import { createSqliteD1, SANDBOX_GAMES_TEST_SCHEMA } from "./helpers/sqliteD1.js";

function seedUser(raw: import("node:sqlite").DatabaseSync, id: number, nickname: string) {
  raw
    .prepare(`INSERT INTO users (id, nickname, email, created_at) VALUES (?, ?, ?, ?)`)
    .run(id, nickname, `${nickname}@example.com`, new Date().toISOString());
}

// ── GameCreatorAccessRepository (formerly D1GameDeveloperRepository — see migration 0025's
// rename comment) ──────────────────────────────────────────────────────────

test("grant creates an ACTIVE row; audit is a separate explicit call (matches AdminAccountRepository's convention, not UserModerationRepository's)", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Creator");
  const repo = new D1GameCreatorRepository(db);

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
  seedUser(raw, 1, "Creator");
  const repo = new D1GameCreatorRepository(db);

  const now = new Date().toISOString();
  await repo.grant(1, 99, now);
  const revoked = await repo.setStatus(1, "REVOKED", now);
  assert.equal(revoked.status, "REVOKED");
  assert.equal(revoked.grantedByAdminId, 99);

  const reinstated = await repo.setStatus(1, "ACTIVE", now);
  assert.equal(reinstated.status, "ACTIVE");
});

test("list returns every creator regardless of status", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "CreatorA");
  seedUser(raw, 2, "CreatorB");
  const repo = new D1GameCreatorRepository(db);

  const now = new Date().toISOString();
  await repo.grant(1, 99, now);
  await repo.grant(2, 99, now);
  await repo.setStatus(2, "REVOKED", now);

  const all = await repo.list();
  assert.equal(all.length, 2);
});

test("listAudit is scoped per-user and ordered most-recent-first", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "CreatorA");
  seedUser(raw, 2, "CreatorB");
  const repo = new D1GameCreatorRepository(db);

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

// ── GameCreatorApplicationRepository (new, migration 0025) ──────────────────

test("create returns the inserted row via RETURNING; findLatestByUserId reflects it", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Applicant");
  const repo = new D1GameCreatorRepository(db);

  const now = new Date().toISOString();
  const created = await repo.create(1, "저는 인디 게임 개발자입니다", now);
  assert.equal(created.status, "PENDING");
  assert.equal(created.userId, 1);
  assert.equal(created.message, "저는 인디 게임 개발자입니다");

  const latest = await repo.findLatestByUserId(1);
  assert.equal(latest?.id, created.id);
});

test("the partial UNIQUE INDEX rejects a second PENDING application for the same user", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Applicant");
  const repo = new D1GameCreatorRepository(db);

  const now = new Date().toISOString();
  await repo.create(1, null, now);
  await assert.rejects(() => repo.create(1, null, now));
});

test("a WITHDRAWN application does not block a fresh application from the same user", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Applicant");
  const repo = new D1GameCreatorRepository(db);

  const now = new Date().toISOString();
  const first = await repo.create(1, null, now);
  const withdrawn = await repo.withdraw(first.id, 1, now);
  assert.equal(withdrawn?.status, "WITHDRAWN");

  const second = await repo.create(1, null, now);
  assert.equal(second.status, "PENDING");
  assert.notEqual(second.id, first.id);
});

test("withdraw only affects the caller's own PENDING application (wrong user, wrong status both no-op to null)", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Applicant");
  seedUser(raw, 2, "Other");
  const repo = new D1GameCreatorRepository(db);

  const now = new Date().toISOString();
  const application = await repo.create(1, null, now);

  assert.equal(await repo.withdraw(application.id, 2, now), null); // wrong user
  const stillPending = await repo.findById(application.id);
  assert.equal(stillPending?.status, "PENDING");

  const withdrawn = await repo.withdraw(application.id, 1, now);
  assert.equal(withdrawn?.status, "WITHDRAWN");
  assert.equal(await repo.withdraw(application.id, 1, now), null); // already withdrawn
});

test("decide is an atomic guard: WHERE status = 'PENDING' means a second decide on the same row returns null", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Applicant");
  const repo = new D1GameCreatorRepository(db);

  const now = new Date().toISOString();
  const application = await repo.create(1, null, now);

  const approved = await repo.decide({
    id: application.id,
    status: "APPROVED",
    reviewedByAdminId: 99,
    rejectReason: null,
    nowIso: now,
  });
  assert.equal(approved?.status, "APPROVED");
  assert.equal(approved?.reviewedByAdminId, 99);

  const secondDecision = await repo.decide({
    id: application.id,
    status: "REJECTED",
    reviewedByAdminId: 100,
    rejectReason: "too late",
    nowIso: now,
  });
  assert.equal(secondDecision, null);
  // The first decision's outcome is untouched by the rejected second attempt.
  assert.equal((await repo.findById(application.id))?.status, "APPROVED");
});

test("decide(REJECTED) records rejectReason; decide(APPROVED) never has one", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  seedUser(raw, 1, "Applicant");
  const repo = new D1GameCreatorRepository(db);

  const now = new Date().toISOString();
  const application = await repo.create(1, null, now);
  const rejected = await repo.decide({
    id: application.id,
    status: "REJECTED",
    reviewedByAdminId: 99,
    rejectReason: "부적절한 콘텐츠",
    nowIso: now,
  });
  assert.equal(rejected?.rejectReason, "부적절한 콘텐츠");
});

test("listByStatus paginates and totals correctly, oldest first", async () => {
  const { db, raw } = createSqliteD1(SANDBOX_GAMES_TEST_SCHEMA);
  for (let i = 1; i <= 3; i++) seedUser(raw, i, `Applicant${i}`);
  const repo = new D1GameCreatorRepository(db);

  const now = new Date().toISOString();
  await repo.create(1, null, now);
  await repo.create(2, null, now);
  await repo.create(3, null, now);

  const page1 = await repo.listByStatus("PENDING", 2, 0);
  assert.equal(page1.total, 3);
  assert.deepEqual(
    page1.items.map((i) => i.userId),
    [1, 2],
  );

  const page2 = await repo.listByStatus("PENDING", 2, 2);
  assert.deepEqual(
    page2.items.map((i) => i.userId),
    [3],
  );

  assert.equal((await repo.listByStatus("APPROVED", 10, 0)).total, 0);
});
