import test from "node:test";
import assert from "node:assert/strict";
import {
  AdminAccountUseCases,
  AdminAccountUseCaseFailure,
} from "../src/application/adminAccountUseCases.js";
import type {
  AdminAccountRepository,
  AdminAccountRecord,
  AdminAccountAuditEntry,
} from "../src/ports/adminAccounts.js";
import type { AdminAuthRepository } from "../src/ports/adminAuth.js";

// Minimal in-memory fakes — this suite exercises the *application-level invariants* (final
// SUPERADMIN protection, duplicate checks, bootstrap gating, session revocation side effects),
// not SQL — see packages/db/test/D1AdminAccountRepository.test.ts for the real-SQLite coverage.

function createFakeRepo(): AdminAccountRepository & {
  rows: AdminAccountRecord[];
  audit: AdminAccountAuditEntry[];
} {
  const rows: AdminAccountRecord[] = [];
  const audit: AdminAccountAuditEntry[] = [];
  let nextId = 1;
  let nextAuditId = 1;

  return {
    rows,
    audit,
    async countActive() {
      return rows.filter((r) => r.status === "ACTIVE").length;
    },
    async countActiveByRole(role) {
      return rows.filter((r) => r.status === "ACTIVE" && r.role === role).length;
    },
    async findById(id) {
      return rows.find((r) => r.id === id) ?? null;
    },
    async findByUserId(userId) {
      return rows.find((r) => r.userId === userId) ?? null;
    },
    async findByUsername(username) {
      return rows.find((r) => r.username === username) ?? null;
    },
    async findByGoogleSub(googleSub) {
      return rows.find((r) => r.googleSub === googleSub) ?? null;
    },
    async list() {
      return [...rows];
    },
    async create(input) {
      const record: AdminAccountRecord = {
        id: nextId++,
        userId: input.userId,
        googleSub: input.googleSub,
        username: input.username,
        passwordHash: input.passwordHash,
        role: input.role,
        status: "ACTIVE",
        mustChangePassword: input.mustChangePassword,
        createdByAdminId: input.createdByAdminId,
        createdAt: input.nowIso,
        updatedAt: input.nowIso,
        passwordChangedAt: input.nowIso,
      };
      rows.push(record);
      return record;
    },
    async updateRole(id, role, nowIso) {
      const r = rows.find((x) => x.id === id);
      if (r) {
        r.role = role;
        r.updatedAt = nowIso;
      }
    },
    async updateStatus(id, status, nowIso) {
      const r = rows.find((x) => x.id === id);
      if (r) {
        r.status = status;
        r.updatedAt = nowIso;
      }
    },
    async updatePassword(id, passwordHash, mustChangePassword, nowIso) {
      const r = rows.find((x) => x.id === id);
      if (r) {
        r.passwordHash = passwordHash;
        r.mustChangePassword = mustChangePassword;
        r.passwordChangedAt = nowIso;
        r.updatedAt = nowIso;
      }
    },
    async appendAudit(entry) {
      audit.push({ id: nextAuditId++, ...entry, createdAt: entry.nowIso });
    },
    async listAudit(limit) {
      return [...audit].reverse().slice(0, limit);
    },
  };
}

function createFakeAuthRepo(): AdminAuthRepository & { revokedForUser: number[] } {
  const revokedForUser: number[] = [];
  return {
    revokedForUser,
    async createStepUpChallenge() {
      throw new Error("not used in this suite");
    },
    async consumeStepUpChallenge() {
      throw new Error("not used in this suite");
    },
    async createAdminSession() {
      throw new Error("not used in this suite");
    },
    async findValidAdminSession() {
      throw new Error("not used in this suite");
    },
    async revokeAdminSession() {},
    async revokeAdminSessionsForSessionToken() {},
    async revokeAllAdminSessionsForUserId(userId: number) {
      revokedForUser.push(userId);
    },
    async recordLoginAttempt() {},
    async listRecentFailedAttempts() {
      return [];
    },
    async cleanupExpired() {},
  };
}

test("bootstrapFirstSuperadmin succeeds once, then rejects when an active account already exists", async () => {
  const repo = createFakeRepo();
  const authRepo = createFakeAuthRepo();
  const useCases = new AdminAccountUseCases(repo, authRepo);

  const account = await useCases.bootstrapFirstSuperadmin({
    userId: 1,
    googleSub: "sub-1",
    username: "root-admin",
    passwordHash: "hash",
  });
  assert.equal(account.role, "SUPERADMIN");
  assert.equal(account.mustChangePassword, true);
  assert.equal(repo.audit.length, 1);
  assert.equal(repo.audit[0]?.action, "ADMIN_CREATED");

  await assert.rejects(
    () =>
      useCases.bootstrapFirstSuperadmin({
        userId: 2,
        googleSub: "sub-2",
        username: "second-root",
        passwordHash: "hash",
      }),
    (err: unknown) =>
      err instanceof AdminAccountUseCaseFailure && err.code === "ALREADY_BOOTSTRAPPED",
  );
});

test("createAdmin rejects duplicate userId/username/googleSub", async () => {
  const repo = createFakeRepo();
  const authRepo = createFakeAuthRepo();
  const useCases = new AdminAccountUseCases(repo, authRepo);

  const superadmin = await useCases.bootstrapFirstSuperadmin({
    userId: 1,
    googleSub: "sub-1",
    username: "root-admin",
    passwordHash: "hash",
  });

  await assert.rejects(
    () =>
      useCases.createAdmin({
        actorAdminId: superadmin.id,
        userId: 1, // duplicate OwOGG user
        googleSub: "sub-x",
        username: "other-name",
        passwordHash: "hash",
        role: "ADMIN",
      }),
    (err: unknown) =>
      err instanceof AdminAccountUseCaseFailure && err.code === "USER_ALREADY_ADMIN",
  );

  await assert.rejects(
    () =>
      useCases.createAdmin({
        actorAdminId: superadmin.id,
        userId: 2,
        googleSub: "sub-x",
        username: "root-admin", // duplicate username
        passwordHash: "hash",
        role: "ADMIN",
      }),
    (err: unknown) => err instanceof AdminAccountUseCaseFailure && err.code === "USERNAME_TAKEN",
  );

  await assert.rejects(
    () =>
      useCases.createAdmin({
        actorAdminId: superadmin.id,
        userId: 2,
        googleSub: "sub-1", // duplicate google sub
        username: "other-name",
        passwordHash: "hash",
        role: "ADMIN",
      }),
    (err: unknown) =>
      err instanceof AdminAccountUseCaseFailure && err.code === "GOOGLE_SUB_ALREADY_ADMIN",
  );
});

test("setStatus/setRole refuse to disable or demote the last active SUPERADMIN", async () => {
  const repo = createFakeRepo();
  const authRepo = createFakeAuthRepo();
  const useCases = new AdminAccountUseCases(repo, authRepo);

  const superadmin = await useCases.bootstrapFirstSuperadmin({
    userId: 1,
    googleSub: "sub-1",
    username: "root-admin",
    passwordHash: "hash",
  });

  await assert.rejects(
    () =>
      useCases.setStatus({
        actorAdminId: superadmin.id,
        targetAdminId: superadmin.id,
        status: "DISABLED",
      }),
    (err: unknown) => err instanceof AdminAccountUseCaseFailure && err.code === "LAST_SUPERADMIN",
  );
  await assert.rejects(
    () =>
      useCases.setRole({
        actorAdminId: superadmin.id,
        targetAdminId: superadmin.id,
        role: "ADMIN",
      }),
    (err: unknown) => err instanceof AdminAccountUseCaseFailure && err.code === "LAST_SUPERADMIN",
  );

  // A second SUPERADMIN makes the demotion/disable of either individual one now safe.
  const second = await useCases.createAdmin({
    actorAdminId: superadmin.id,
    userId: 2,
    googleSub: "sub-2",
    username: "second-root",
    passwordHash: "hash",
    role: "SUPERADMIN",
  });
  await useCases.setRole({ actorAdminId: superadmin.id, targetAdminId: second.id, role: "ADMIN" });
  assert.equal((await repo.findById(second.id))?.role, "ADMIN");
});

test("changeOwnPassword clears must_change_password and revokes this user's other sessions", async () => {
  const repo = createFakeRepo();
  const authRepo = createFakeAuthRepo();
  const useCases = new AdminAccountUseCases(repo, authRepo);

  const account = await useCases.bootstrapFirstSuperadmin({
    userId: 1,
    googleSub: "sub-1",
    username: "root-admin",
    passwordHash: "old-hash",
  });
  assert.equal(account.mustChangePassword, true);

  await useCases.changeOwnPassword({
    accountId: account.id,
    userId: 1,
    newPasswordHash: "new-hash",
  });

  const updated = await repo.findById(account.id);
  assert.equal(updated?.mustChangePassword, false);
  assert.equal(updated?.passwordHash, "new-hash");
  assert.deepEqual(authRepo.revokedForUser, [1]);
});

test("resetPassword forces must_change_password=true and revokes the target's sessions", async () => {
  const repo = createFakeRepo();
  const authRepo = createFakeAuthRepo();
  const useCases = new AdminAccountUseCases(repo, authRepo);

  const superadmin = await useCases.bootstrapFirstSuperadmin({
    userId: 1,
    googleSub: "sub-1",
    username: "root-admin",
    passwordHash: "hash",
  });
  await useCases.changeOwnPassword({
    accountId: superadmin.id,
    userId: 1,
    newPasswordHash: "hash2",
  });

  const target = await useCases.createAdmin({
    actorAdminId: superadmin.id,
    userId: 2,
    googleSub: "sub-2",
    username: "other-admin",
    passwordHash: "hash",
    role: "ADMIN",
  });
  await useCases.changeOwnPassword({ accountId: target.id, userId: 2, newPasswordHash: "hash3" });
  assert.equal((await repo.findById(target.id))?.mustChangePassword, false);

  await useCases.resetPassword({
    actorAdminId: superadmin.id,
    targetAdminId: target.id,
    newPasswordHash: "temp-hash",
  });

  const updated = await repo.findById(target.id);
  assert.equal(updated?.mustChangePassword, true);
  assert.equal(updated?.passwordHash, "temp-hash");
  assert.ok(authRepo.revokedForUser.includes(2));
});
