import type { DiscordLinkChallenge, DiscordLinkRepository } from "@owogg/core";
import type { D1Database } from "./D1UserRepository.js";

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRandomToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export class D1DiscordLinkRepository implements DiscordLinkRepository {
  constructor(private db: D1Database) {}

  async createChallenge(input: {
    discordUserId: string;
    discordUsername: string;
    ttlSeconds: number;
  }): Promise<{ token: string; expiresAt: string }> {
    const token = generateRandomToken();
    const tokenHash = await hashToken(token);
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000).toISOString();

    await this.db
      .prepare(
        `INSERT INTO discord_link_challenges (token_hash, discord_user_id, discord_username, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(tokenHash, input.discordUserId, input.discordUsername, createdAt, expiresAt)
      .run();

    return { token, expiresAt };
  }

  async findChallengeByToken(token: string): Promise<DiscordLinkChallenge | null> {
    const tokenHash = await hashToken(token);
    const row = await this.db
      .prepare(
        `SELECT discord_user_id, discord_username, created_at, expires_at, consumed_at
         FROM discord_link_challenges WHERE token_hash = ?`,
      )
      .bind(tokenHash)
      .first<Record<string, unknown>>();

    if (!row) return null;

    return {
      discordUserId: String(row.discord_user_id),
      discordUsername: String(row.discord_username),
      createdAt: String(row.created_at),
      expiresAt: String(row.expires_at),
      consumedAt: row.consumed_at ? String(row.consumed_at) : null,
    };
  }

  async consumeChallengeByToken(token: string): Promise<void> {
    const tokenHash = await hashToken(token);
    await this.db
      .prepare(
        `UPDATE discord_link_challenges SET consumed_at = datetime('now') WHERE token_hash = ?`,
      )
      .bind(tokenHash)
      .run();
  }
}
