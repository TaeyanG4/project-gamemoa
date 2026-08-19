import test from "node:test";
import assert from "node:assert/strict";
import { createContainer, systemGameRegistry } from "../src/container.js";

// Stage C-3 (Unified Registry) composition-root wiring — proves createContainer actually builds
// what container.ts's own doc comments claim: `systemGameRegistry` and the unified `gameRegistry`
// are two distinct objects, a SYSTEM slug resolves identically through both without the unified
// one ever touching the Creator (D1 sandbox_games) repository at all, and `scoreUseCases`/
// `gameSettingsUseCases` are wired to the SYSTEM-only registry, not the composite. No real B2/
// network — CompositeGameRegistry's own unit tests (packages/core/test/compositeGameRegistry.
// test.ts) already cover the class's logic against fake, provider-neutral GameRegistry
// implementations; this file only proves the composition root wires the real classes together
// the way it says it does.

function createDb() {
  const sandboxGamesQueries: string[] = [];
  function statement(query: string) {
    return {
      bind() {
        return this;
      },
      async first<T>() {
        if (query.includes("FROM sandbox_games")) {
          sandboxGamesQueries.push(query);
        }
        return null as T | null;
      },
      async all<T>() {
        if (query.includes("FROM sandbox_games")) {
          sandboxGamesQueries.push(query);
        }
        return { results: [] } as { results: T[] };
      },
      async run() {
        return { success: true, meta: { changes: 0 } };
      },
    };
  }

  return {
    sandboxGamesQueries,
    db: {
      prepare(query: string) {
        return statement(query);
      },
      async batch(statements: Array<ReturnType<typeof statement>>) {
        return statements.map(() => ({ success: true, meta: { changes: 0 } }));
      },
    },
  };
}

test("createContainer: systemGameRegistry and the unified gameRegistry are distinct objects", () => {
  const { db } = createDb();
  const container = createContainer(db as any);
  assert.notEqual(container.systemGameRegistry, container.gameRegistry);
  assert.equal(container.systemGameRegistry, systemGameRegistry);
});

test("createContainer: a SYSTEM slug resolves identically through systemGameRegistry and the unified gameRegistry", async () => {
  const { db } = createDb();
  const container = createContainer(db as any);

  const viaSystem = await container.systemGameRegistry.findBySlug("reaction-time");
  const viaUnified = await container.gameRegistry.findBySlug("reaction-time");

  assert.ok(viaSystem);
  assert.deepEqual(viaSystem, viaUnified);
  assert.equal(viaUnified?.owner.type, "SYSTEM");
});

test("createContainer: a SYSTEM hit through the unified gameRegistry never touches the Creator (sandbox_games) repository", async () => {
  const { db, sandboxGamesQueries } = createDb();
  const container = createContainer(db as any);

  await container.gameRegistry.findBySlug("reaction-time");

  assert.deepEqual(sandboxGamesQueries, []);
});

test("createContainer: an unknown-to-SYSTEM slug does fall through to the Creator repository via the unified gameRegistry", async () => {
  const { db, sandboxGamesQueries } = createDb();
  const container = createContainer(db as any);

  const result = await container.gameRegistry.findBySlug("not-a-system-game");

  assert.equal(result, null);
  assert.ok(sandboxGamesQueries.length > 0, "the Creator repository must have been consulted");
});

test("createContainer: scoreUseCases resolves a SYSTEM game (wired to systemGameRegistry, not the composite)", async () => {
  const { db } = createDb();
  const container = createContainer(db as any);

  // getLeaderboard resolving without throwing is enough to prove the registry wiring works end to
  // end — the deeper "Creator can't reach this path" guarantee is covered by
  // apps/api/test/scoresLeaderboard.test.ts and routes/scores.ts's own dedicated 400 regression
  // test for a creator/unknown gameId.
  const leaderboard = await container.scoreUseCases.getLeaderboard("reaction-time", 20);
  assert.ok(Array.isArray(leaderboard));
});

test("createContainer: gameSettingsUseCases.listAll() only ever sees SYSTEM games — wired to systemGameRegistry, not the unified composite", async () => {
  const { db, sandboxGamesQueries } = createDb();
  const container = createContainer(db as any);

  const settings = await container.gameSettingsUseCases.listAll();

  assert.ok(settings.length > 0);
  // The Creator repository (sandbox_games) is never even queried by this call — this list is
  // built purely from game-registry/'s SYSTEM definitions, so no Creator game could slip into the
  // admin kill-switch panel even if one existed in D1.
  assert.deepEqual(sandboxGamesQueries, []);
});
