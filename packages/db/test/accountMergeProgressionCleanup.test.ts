import test from "node:test";
import assert from "node:assert/strict";
import { D1AccountMergeRepository } from "../src/d1/D1AccountMergeRepository.js";
import type { D1Database } from "../src/d1/D1UserRepository.js";

/**
 * Verifies the Primary-Account-Wins invariant extends to progression data: secondary XP
 * events, the secondary's progress aggregate, and secondary achievement unlocks must not
 * survive a merge as ghost data, and must never be added onto the primary.
 */
function createMockD1(seed: {
  xpEvents: { user_id: number }[];
  userProgress: { user_id: number }[];
  userAchievements: { user_id: number }[];
}): { db: D1Database; deletedFrom: Record<string, number[]> } {
  const deletedFrom: Record<string, number[]> = {
    scores: [],
    user_favorites: [],
    user_recent_plays: [],
    xp_events: [],
    user_progress: [],
    user_achievements: [],
    sessions: [],
    users: [],
  };

  const db: D1Database = {
    prepare(query: string) {
      let bound: unknown[] = [];
      const stmt = {
        bind(...args: unknown[]) {
          bound = args;
          return stmt;
        },
        async first() {
          return null;
        },
        async all() {
          return { results: [] };
        },
        async run() {
          // Matches both `DELETE FROM <table> WHERE user_id = ?` and, for the `users`
          // table itself, `DELETE FROM users WHERE id = ?`.
          const match = query.match(/DELETE FROM (\w+) WHERE (?:user_id|id) = \?/);
          if (match) {
            deletedFrom[match[1]].push(bound[0] as number);
          }
          return { success: true };
        },
      };
      return stmt as unknown as ReturnType<D1Database["prepare"]>;
    },
    async batch(statements) {
      // Real D1 executes batch statements in order within one transaction; the mock
      // just runs each prepared statement's bound run(), matching that ordering.
      const results = [];
      for (const s of statements) {
        results.push(await s.run());
      }
      return results;
    },
  };

  void seed;
  return { db, deletedFrom };
}

test("mergeAccounts deletes the secondary user's XP events, progress aggregate, and achievements", async () => {
  const { db, deletedFrom } = createMockD1({
    xpEvents: [{ user_id: 2 }],
    userProgress: [{ user_id: 2 }],
    userAchievements: [{ user_id: 2 }],
  });
  const repo = new D1AccountMergeRepository(db);

  await repo.mergeAccounts(1, 2);

  assert.deepEqual(deletedFrom.xp_events, [2]);
  assert.deepEqual(deletedFrom.user_progress, [2]);
  assert.deepEqual(deletedFrom.user_achievements, [2]);
  // Existing invariants must still hold: gameplay/personalization also deleted for secondary.
  assert.deepEqual(deletedFrom.scores, [2]);
  assert.deepEqual(deletedFrom.user_favorites, [2]);
  assert.deepEqual(deletedFrom.user_recent_plays, [2]);
  assert.deepEqual(deletedFrom.users, [2]);
  // Primary (userId 1) must never be targeted by any deletion.
  for (const table of Object.keys(deletedFrom)) {
    assert.ok(!deletedFrom[table].includes(1), `primary user must not be deleted from ${table}`);
  }
});
