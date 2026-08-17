import test from "node:test";
import assert from "node:assert/strict";
import {
  GameDeveloperUseCases,
  GameDeveloperUseCaseFailure,
} from "../src/application/gameDeveloperUseCases.js";
import type {
  GameDeveloperRepository,
  GameDeveloperRecord,
  GameDeveloperAuditEntry,
} from "../src/ports/gameDevelopers.js";
import type { UserRepository, User } from "../src/ports/repositories.js";

function createFakeRepo(): GameDeveloperRepository & {
  records: Map<number, GameDeveloperRecord>;
  audit: GameDeveloperAuditEntry[];
} {
  const records = new Map<number, GameDeveloperRecord>();
  const audit: GameDeveloperAuditEntry[] = [];
  let nextAuditId = 1;

  return {
    records,
    audit,
    async findByUserId(userId) {
      return records.get(userId) ?? null;
    },
    async list() {
      return [...records.values()];
    },
    async grant(userId, grantedByAdminId, nowIso) {
      const record: GameDeveloperRecord = {
        userId,
        grantedByAdminId,
        status: "ACTIVE",
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      records.set(userId, record);
      return record;
    },
    async setStatus(userId, status, nowIso) {
      const existing = records.get(userId);
      if (!existing) throw new Error("not found");
      const record = { ...existing, status, updatedAt: nowIso };
      records.set(userId, record);
      return record;
    },
    async appendAudit(entry) {
      audit.push({
        id: nextAuditId++,
        targetUserId: entry.targetUserId,
        actorAdminId: entry.actorAdminId,
        action: entry.action,
        createdAt: entry.nowIso,
      });
    },
    async listAudit(targetUserId) {
      return audit.filter((a) => a.targetUserId === targetUserId).reverse();
    },
  };
}

function createFakeUserRepo(existingIds: number[]): UserRepository {
  const users = new Map<number, User>(
    existingIds.map((id) => [
      id,
      {
        id,
        nickname: `user-${id}`,
        email: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]),
  );
  return {
    async findById(id) {
      return users.get(id) ?? null;
    },
    async findByOAuth() {
      return null;
    },
    async findOrCreateUser() {
      throw new Error("not used in this suite");
    },
    async getOAuthAccounts() {
      return [];
    },
    async findOAuthAccount() {
      return null;
    },
    async linkOAuthAccount() {},
    async unlinkOAuthAccount() {},
    async updateNickname() {
      throw new Error("not used in this suite");
    },
    async updateCountry() {
      throw new Error("not used in this suite");
    },
    async updateLocale() {
      throw new Error("not used in this suite");
    },
    async updateVisibility() {
      throw new Error("not used in this suite");
    },
  };
}

test("grant rejects a nonexistent target user with USER_NOT_FOUND", async () => {
  const repo = createFakeRepo();
  const useCases = new GameDeveloperUseCases(repo, createFakeUserRepo([]));
  await assert.rejects(
    () => useCases.grant(1, 99),
    (err: unknown) => err instanceof GameDeveloperUseCaseFailure && err.code === "USER_NOT_FOUND",
  );
});

test("grant writes a GRANTED audit entry on first grant, REINSTATED on a second grant after revoke", async () => {
  const repo = createFakeRepo();
  const useCases = new GameDeveloperUseCases(repo, createFakeUserRepo([1]));

  await useCases.grant(1, 99);
  assert.equal(repo.audit.at(-1)?.action, "GRANTED");

  await useCases.revoke(1, 99);
  await useCases.grant(1, 99);
  assert.equal(repo.audit.at(-1)?.action, "REINSTATED");
  assert.equal((await useCases.getByUserId(1))?.status, "ACTIVE");
});

test("grant on an already-ACTIVE developer is rejected with ALREADY_ACTIVE", async () => {
  const repo = createFakeRepo();
  const useCases = new GameDeveloperUseCases(repo, createFakeUserRepo([1]));
  await useCases.grant(1, 99);
  await assert.rejects(
    () => useCases.grant(1, 99),
    (err: unknown) => err instanceof GameDeveloperUseCaseFailure && err.code === "ALREADY_ACTIVE",
  );
});

test("revoke on a never-granted or already-revoked user is rejected with NOT_A_DEVELOPER", async () => {
  const repo = createFakeRepo();
  const useCases = new GameDeveloperUseCases(repo, createFakeUserRepo([1]));
  await assert.rejects(
    () => useCases.revoke(1, 99),
    (err: unknown) => err instanceof GameDeveloperUseCaseFailure && err.code === "NOT_A_DEVELOPER",
  );

  await useCases.grant(1, 99);
  await useCases.revoke(1, 99);
  await assert.rejects(
    () => useCases.revoke(1, 99),
    (err: unknown) => err instanceof GameDeveloperUseCaseFailure && err.code === "NOT_A_DEVELOPER",
  );
});

test("isActiveDeveloper reflects grant/revoke state", async () => {
  const repo = createFakeRepo();
  const useCases = new GameDeveloperUseCases(repo, createFakeUserRepo([1]));
  assert.equal(await useCases.isActiveDeveloper(1), false);
  await useCases.grant(1, 99);
  assert.equal(await useCases.isActiveDeveloper(1), true);
  await useCases.revoke(1, 99);
  assert.equal(await useCases.isActiveDeveloper(1), false);
});
