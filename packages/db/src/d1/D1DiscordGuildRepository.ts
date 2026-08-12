import type {
  DiscordGuild,
  DiscordGuildManager,
  DiscordGuildRepository,
  DiscordGuildVisibility,
  DiscordGuildRegistrationStatus,
  DiscordCandidateGuild,
  DiscordRegistrationChallenge,
} from "@gamemoa/core";
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

function mapGuildRow(row: Record<string, unknown>): DiscordGuild {
  return {
    guild_id: String(row.guild_id),
    slug: String(row.slug),
    name: String(row.name),
    icon_url: row.icon_url ? String(row.icon_url) : null,
    description: row.description ? String(row.description) : null,
    visibility: String(row.visibility) as DiscordGuildVisibility,
    registration_status: String(row.registration_status) as DiscordGuildRegistrationStatus,
    registered_by_user_id: Number(row.registered_by_user_id),
    registered_at: String(row.registered_at),
    first_seen_at: String(row.first_seen_at),
    last_seen_at: String(row.last_seen_at),
    updated_at: String(row.updated_at),
  };
}

export class D1DiscordGuildRepository implements DiscordGuildRepository {
  constructor(private db: D1Database) {}

  async createRegistrationChallenge(input: {
    userId: number;
    manageableGuilds: DiscordCandidateGuild[];
    ttlSeconds?: number;
  }): Promise<{ token: string; expiresAt: string }> {
    const token = generateRandomToken();
    const tokenHash = await hashToken(token);
    const createdAt = new Date().toISOString();
    const ttl = input.ttlSeconds ?? 900; // default 15 mins
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    const jsonStr = JSON.stringify(input.manageableGuilds);

    await this.db
      .prepare(
        `INSERT INTO discord_server_registration_challenges (token_hash, user_id, manageable_guilds_json, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(tokenHash, input.userId, jsonStr, createdAt, expiresAt)
      .run();

    return { token, expiresAt };
  }

  async findRegistrationChallengeByToken(
    token: string,
  ): Promise<DiscordRegistrationChallenge | null> {
    const tokenHash = await hashToken(token);
    const row = await this.db
      .prepare(
        `SELECT token_hash, user_id, manageable_guilds_json, created_at, expires_at, consumed_at
         FROM discord_server_registration_challenges WHERE token_hash = ?`,
      )
      .bind(tokenHash)
      .first<Record<string, unknown>>();

    if (!row) return null;

    let manageableGuilds: DiscordCandidateGuild[] = [];
    try {
      manageableGuilds = JSON.parse(String(row.manageable_guilds_json)) as DiscordCandidateGuild[];
    } catch {
      manageableGuilds = [];
    }

    return {
      tokenHash: String(row.token_hash),
      userId: Number(row.user_id),
      manageableGuilds,
      createdAt: String(row.created_at),
      expiresAt: String(row.expires_at),
      consumedAt: row.consumed_at ? String(row.consumed_at) : null,
    };
  }

  async consumeRegistrationChallengeByToken(token: string): Promise<void> {
    const tokenHash = await hashToken(token);
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE discord_server_registration_challenges SET consumed_at = ? WHERE token_hash = ?`,
      )
      .bind(now, tokenHash)
      .run();
  }

  async registerGuild(input: {
    guildId: string;
    slug: string;
    name: string;
    iconUrl?: string | null;
    description?: string | null;
    visibility: DiscordGuildVisibility;
    userId: number;
  }): Promise<DiscordGuild> {
    const now = new Date().toISOString();
    const iconUrl = input.iconUrl ?? null;
    const description = input.description ?? null;

    const stmtGuild = this.db
      .prepare(
        `INSERT INTO discord_guilds (
        guild_id, slug, name, icon_url, description, visibility, registration_status,
        registered_by_user_id, registered_at, first_seen_at, last_seen_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.guildId,
        input.slug,
        input.name,
        iconUrl,
        description,
        input.visibility,
        input.userId,
        now,
        now,
        now,
        now,
      );

    const stmtManager = this.db
      .prepare(
        `INSERT INTO discord_guild_managers (guild_id, user_id, role, created_at, updated_at)
       VALUES (?, ?, 'OWNER', ?, ?)`,
      )
      .bind(input.guildId, input.userId, now, now);

    await this.db.batch([stmtGuild, stmtManager]);

    const created = await this.findByGuildId(input.guildId);
    if (!created) {
      throw new Error("Failed to create guild row");
    }
    return created;
  }

  async findByGuildId(guildId: string): Promise<DiscordGuild | null> {
    const row = await this.db
      .prepare(`SELECT * FROM discord_guilds WHERE guild_id = ?`)
      .bind(guildId)
      .first<Record<string, unknown>>();

    if (!row) return null;
    return mapGuildRow(row);
  }

  async findBySlug(slug: string): Promise<DiscordGuild | null> {
    const row = await this.db
      .prepare(`SELECT * FROM discord_guilds WHERE slug = ?`)
      .bind(slug)
      .first<Record<string, unknown>>();

    if (!row) return null;
    return mapGuildRow(row);
  }

  async updateGuild(
    guildId: string,
    updates: {
      slug?: string;
      description?: string | null;
      visibility?: DiscordGuildVisibility;
      registrationStatus?: DiscordGuildRegistrationStatus;
      name?: string;
      iconUrl?: string | null;
    },
  ): Promise<DiscordGuild> {
    const fields: string[] = [];
    const values: unknown[] = [];
    const now = new Date().toISOString();

    if (updates.slug !== undefined) {
      fields.push("slug = ?");
      values.push(updates.slug);
    }
    if (updates.name !== undefined) {
      fields.push("name = ?");
      values.push(updates.name);
    }
    if (updates.iconUrl !== undefined) {
      fields.push("icon_url = ?");
      values.push(updates.iconUrl);
    }
    if (updates.description !== undefined) {
      fields.push("description = ?");
      values.push(updates.description);
    }
    if (updates.visibility !== undefined) {
      fields.push("visibility = ?");
      values.push(updates.visibility);
    }
    if (updates.registrationStatus !== undefined) {
      fields.push("registration_status = ?");
      values.push(updates.registrationStatus);
    }

    fields.push("updated_at = ?");
    values.push(now);
    fields.push("last_seen_at = ?");
    values.push(now);

    values.push(guildId);

    const query = `UPDATE discord_guilds SET ${fields.join(", ")} WHERE guild_id = ?`;
    await this.db
      .prepare(query)
      .bind(...values)
      .run();

    const updated = await this.findByGuildId(guildId);
    if (!updated) {
      throw new Error("Guild not found after update");
    }
    return updated;
  }

  async searchPublicGuilds(
    query?: string,
    limit = 20,
    offset = 0,
  ): Promise<{ guilds: DiscordGuild[]; total: number }> {
    const trimmedQuery = query?.trim().toLowerCase() ?? "";

    if (trimmedQuery) {
      const searchPattern = `%${trimmedQuery}%`;

      const countRow = await this.db
        .prepare(
          `SELECT COUNT(*) as total FROM discord_guilds
           WHERE visibility = 'PUBLIC' AND registration_status = 'ACTIVE'
           AND (LOWER(name) LIKE ? OR LOWER(slug) LIKE ?)`,
        )
        .bind(searchPattern, searchPattern)
        .first<{ total: number }>();

      const rows = await this.db
        .prepare(
          `SELECT * FROM discord_guilds
           WHERE visibility = 'PUBLIC' AND registration_status = 'ACTIVE'
           AND (LOWER(name) LIKE ? OR LOWER(slug) LIKE ?)
           ORDER BY name ASC LIMIT ? OFFSET ?`,
        )
        .bind(searchPattern, searchPattern, limit, offset)
        .all<Record<string, unknown>>();

      const guilds = (rows.results || []).map(mapGuildRow);
      return { guilds, total: countRow?.total ?? guilds.length };
    }

    const countRow = await this.db
      .prepare(
        `SELECT COUNT(*) as total FROM discord_guilds
         WHERE visibility = 'PUBLIC' AND registration_status = 'ACTIVE'`,
      )
      .first<{ total: number }>();

    const rows = await this.db
      .prepare(
        `SELECT * FROM discord_guilds
         WHERE visibility = 'PUBLIC' AND registration_status = 'ACTIVE'
         ORDER BY name ASC LIMIT ? OFFSET ?`,
      )
      .bind(limit, offset)
      .all<Record<string, unknown>>();

    const guilds = (rows.results || []).map(mapGuildRow);
    return { guilds, total: countRow?.total ?? guilds.length };
  }

  async isGuildManager(guildId: string, userId: number): Promise<boolean> {
    const row = await this.db
      .prepare(`SELECT 1 FROM discord_guild_managers WHERE guild_id = ? AND user_id = ?`)
      .bind(guildId, userId)
      .first();

    return Boolean(row);
  }

  async addGuildManager(guildId: string, userId: number, role = "MANAGER"): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT OR IGNORE INTO discord_guild_managers (guild_id, user_id, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(guildId, userId, role, now, now)
      .run();
  }

  async getUserManagedGuilds(userId: number): Promise<DiscordGuild[]> {
    const rows = await this.db
      .prepare(
        `SELECT g.* FROM discord_guilds g
         JOIN discord_guild_managers m ON g.guild_id = m.guild_id
         WHERE m.user_id = ? AND g.registration_status = 'ACTIVE'
         ORDER BY g.name ASC`,
      )
      .bind(userId)
      .all<Record<string, unknown>>();

    return (rows.results || []).map(mapGuildRow);
  }
}
