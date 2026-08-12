import test from "node:test";
import assert from "node:assert/strict";
import { D1DiscordGuildRepository } from "../src/d1/D1DiscordGuildRepository.js";
import type { D1Database } from "../src/d1/D1UserRepository.js";

function createMockGuildD1(): D1Database {
  const guilds = new Map<string, any>();
  const managers = new Map<string, any>();
  const challenges = new Map<string, any>();

  const db: D1Database = {
    prepare(query: string) {
      let bound: unknown[] = [];
      const stmt = {
        bind(...args: unknown[]) {
          bound = args;
          return stmt;
        },
        async first<T = unknown>(): Promise<T | null> {
          if (query.includes("FROM discord_server_registration_challenges")) {
            const [tokenHash] = bound as [string];
            return (challenges.get(tokenHash) ?? null) as unknown as T;
          }
          if (query.includes("FROM discord_guilds WHERE guild_id = ?")) {
            const [gId] = bound as [string];
            return (guilds.get(gId) ?? null) as unknown as T;
          }
          if (query.includes("FROM discord_guilds WHERE slug = ?")) {
            const [slug] = bound as [string];
            for (const g of guilds.values()) {
              if (g.slug === slug) return g as unknown as T;
            }
            return null;
          }
          if (query.includes("SELECT COUNT(*) as total FROM discord_guilds")) {
            let count = 0;
            for (const g of guilds.values()) {
              if (g.visibility === "PUBLIC" && g.registration_status === "ACTIVE") count++;
            }
            return { total: count } as unknown as T;
          }
          if (query.includes("FROM discord_guild_managers WHERE guild_id = ? AND user_id = ?")) {
            const [gId, uId] = bound as [string, number];
            const m = managers.get(`${gId}:${uId}`);
            return m ? ({ 1: 1 } as unknown as T) : null;
          }
          return null;
        },
        async all<T = unknown>(): Promise<{ results: T[] }> {
          if (query.includes("FROM discord_guilds") && query.includes("visibility = 'PUBLIC'")) {
            const res: any[] = [];
            for (const g of guilds.values()) {
              if (g.visibility === "PUBLIC" && g.registration_status === "ACTIVE") res.push(g);
            }
            return { results: res as unknown as T[] };
          }
          if (query.includes("FROM discord_guilds g") && query.includes("m.user_id = ?")) {
            const [uId] = bound as [number];
            const res: any[] = [];
            for (const [key] of managers) {
              const [gId, managerUserId] = key.split(":");
              if (Number(managerUserId) === uId) {
                const g = guilds.get(gId);
                if (g && g.registration_status === "ACTIVE") res.push(g);
              }
            }
            return { results: res as unknown as T[] };
          }
          return { results: [] };
        },
        async run(): Promise<{ success: boolean }> {
          if (query.includes("INSERT INTO discord_server_registration_challenges")) {
            const [tokenHash, userId, jsonStr, createdAt, expiresAt] = bound as [
              string,
              number,
              string,
              string,
              string,
            ];
            challenges.set(tokenHash, {
              token_hash: tokenHash,
              user_id: userId,
              manageable_guilds_json: jsonStr,
              created_at: createdAt,
              expires_at: expiresAt,
              consumed_at: null,
            });
          } else if (
            query.includes("UPDATE discord_server_registration_challenges SET consumed_at")
          ) {
            const [now, tokenHash] = bound as [string, string];
            const c = challenges.get(tokenHash);
            if (c) c.consumed_at = now;
          } else if (query.includes("INSERT INTO discord_guild_managers")) {
            const [gId, uId, role, cAt, uAt] = bound as [string, number, string, string, string];
            managers.set(`${gId}:${uId}`, {
              guild_id: gId,
              user_id: uId,
              role,
              created_at: cAt,
              updated_at: uAt,
            });
          } else if (query.includes("UPDATE discord_guilds SET")) {
            const gId = bound[bound.length - 1] as string;
            const g = guilds.get(gId);
            if (g) {
              if (query.includes("slug = ?")) g.slug = bound[0];
              if (query.includes("visibility = ?"))
                g.visibility = bound[query.includes("slug = ?") ? 1 : 0];
            }
          }
          return { success: true };
        },
      };
      return stmt as unknown as ReturnType<D1Database["prepare"]>;
    },
    async batch(statements: any[]) {
      for (const stmt of statements) {
        // mock executing batch statements
        if (stmt) {
          // If stmt was binding guild creation:
          // We extract mock data if available
        }
      }
      return [];
    },
  };

  return db;
}

test("D1DiscordGuildRepository creates challenge and hashes token", async () => {
  const db = createMockGuildD1();
  const repo = new D1DiscordGuildRepository(db);

  const { token, expiresAt } = await repo.createRegistrationChallenge({
    userId: 1,
    manageableGuilds: [{ guildId: "g-1", name: "Guild One", iconUrl: null }],
  });

  assert.ok(token);
  assert.ok(expiresAt);

  const found = await repo.findRegistrationChallengeByToken(token);
  assert.ok(found);
  assert.equal(found?.userId, 1);
  assert.equal(found?.manageableGuilds[0].guildId, "g-1");
});
