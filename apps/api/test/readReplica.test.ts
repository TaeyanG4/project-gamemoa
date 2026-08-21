import test from "node:test";
import assert from "node:assert/strict";
import { createReadContainer } from "../src/readReplica.js";

const noopStatement = {
  bind: () => noopStatement,
  first: async () => null,
  all: async () => ({ results: [] }),
  run: async () => ({ success: true, meta: { changes: 0 } }),
};

test("falls back to the plain binding when withSession is unavailable", () => {
  // The bare D1 test doubles used throughout this suite have no withSession — the read path must
  // keep working against them rather than throwing.
  let prepared = 0;
  const plainDb = {
    prepare: () => {
      prepared += 1;
      return noopStatement;
    },
    batch: async () => [],
  };

  const container = createReadContainer(plainDb);
  assert.ok(container.scoreRepo, "a usable read container must still be built");

  void container.scoreRepo.getLeaderboard("reaction-time", 20, "desc", "normal");
  assert.ok(prepared > 0, "queries must go straight to the plain binding");
});

test("uses a first-unconstrained session when the binding supports replication", () => {
  const constraints: unknown[] = [];
  let sessionPrepareCount = 0;

  const replicatedDb = {
    prepare: () => {
      throw new Error("replica-eligible reads must not bypass the session");
    },
    batch: async () => [],
    withSession(constraint?: unknown) {
      constraints.push(constraint);
      return {
        prepare: () => {
          sessionPrepareCount += 1;
          return noopStatement;
        },
        batch: async () => [],
        getBookmark: () => null,
      };
    },
  };

  const container = createReadContainer(replicatedDb);
  void container.scoreRepo.getLeaderboard("reaction-time", 20, "desc", "normal");

  assert.deepEqual(
    constraints,
    ["first-unconstrained"],
    "reads should be allowed to start on any instance, not forced to the primary region",
  );
  assert.ok(sessionPrepareCount > 0, "queries must be issued through the session object");
});

test("each call creates its own session rather than sharing one across requests", () => {
  let sessions = 0;
  const replicatedDb = {
    prepare: () => noopStatement,
    batch: async () => [],
    withSession: () => {
      sessions += 1;
      return { prepare: () => noopStatement, batch: async () => [], getBookmark: () => null };
    },
  };

  createReadContainer(replicatedDb);
  createReadContainer(replicatedDb);

  assert.equal(sessions, 2, "a session must not leak state between unrelated requests");
});
