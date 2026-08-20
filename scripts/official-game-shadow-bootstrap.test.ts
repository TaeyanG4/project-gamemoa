import assert from "node:assert/strict";
import test from "node:test";
import {
  D1OfficialGameShadowRepository,
  renderD1Sql,
  type D1SqlExecutor,
} from "./official-game-shadow-bootstrap.js";

test("B-1 remote D1 executor renders bound values safely and always terminates a Wrangler command", () => {
  assert.equal(
    renderD1Sql("SELECT ? AS text, ? AS number, ? AS nothing", ["O'Reilly", 42, null]),
    "SELECT 'O''Reilly' AS text, 42 AS number, NULL AS nothing;",
  );
  assert.equal(renderD1Sql("SELECT 1;", []), "SELECT 1;");
});

test("B-1 D1 identity allocation is OWOGG-only and fails closed for an existing USER slug", async () => {
  const calls: string[] = [];
  let inserted = false;
  const executor: D1SqlExecutor = {
    async query<T extends Record<string, unknown>>(sql: string): Promise<readonly T[]> {
      calls.push(sql);
      if (sql.includes("FROM games WHERE slug")) {
        if (!inserted) return [];
        return [
          {
            id: 91,
            slug: "reaction-time",
            publisher_type: "OWOGG",
            publisher_user_id: null,
            visibility: "PRIVATE",
            live_version_id: null,
            deleted_at: null,
            created_at: "2026-08-21T00:00:00.000Z",
            updated_at: "2026-08-21T00:00:00.000Z",
          } as unknown as T,
        ];
      }
      if (sql.includes("INSERT INTO games")) {
        inserted = true;
        return [];
      }
      throw new Error(`unexpected SQL: ${sql}`);
    },
  };
  const repo = new D1OfficialGameShadowRepository(executor);
  const identity = await repo.ensureOwoggIdentity({
    slug: "reaction-time",
    nowIso: "2026-08-21T00:00:00.000Z",
  });
  assert.deepEqual(identity.publisher, { type: "OWOGG" });
  assert.ok(calls.some((sql) => sql.includes("'OWOGG'")));
  assert.equal(
    calls.some((sql) => /sandbox_games|sandbox_game_versions|review/i.test(sql)),
    false,
  );

  const userExecutor: D1SqlExecutor = {
    async query<T extends Record<string, unknown>>(): Promise<readonly T[]> {
      return [
        {
          id: 92,
          slug: "reaction-time",
          publisher_type: "USER",
          publisher_user_id: 7,
          visibility: "PRIVATE",
          live_version_id: null,
          deleted_at: null,
          created_at: "2026-08-21T00:00:00.000Z",
          updated_at: "2026-08-21T00:00:00.000Z",
        } as unknown as T,
      ];
    },
  };
  await assert.rejects(
    () =>
      new D1OfficialGameShadowRepository(userExecutor).ensureOwoggIdentity({
        slug: "reaction-time",
        nowIso: "2026-08-21T00:00:00.000Z",
      }),
    /authority conflict/,
  );
});
