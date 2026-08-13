import type {
  CreatorRepository,
  CreatorProfile,
  CreatorPlatformAccount,
  CreatorRankEntry,
  CreatorPlatformType,
  CreatorStatusType,
  FeaturedStatusType,
} from "@gamemoa/core";
import type { D1Database } from "./D1UserRepository.js";

function mapPlatformAccountRow(r: Record<string, unknown>): CreatorPlatformAccount {
  return {
    id: Number(r.id),
    creatorId: Number(r.creator_id),
    platform: String(r.platform) as CreatorPlatformType,
    platformUserId: String(r.platform_user_id),
    channelName: String(r.channel_name),
    channelHandle: r.channel_handle ? String(r.channel_handle) : null,
    channelUrl: String(r.channel_url),
    avatarUrl: r.avatar_url ? String(r.avatar_url) : null,
    verificationStatus: String(r.verification_status),
    verifiedAt: r.verified_at ? String(r.verified_at) : null,
    audienceCount: r.audience_count !== undefined ? Number(r.audience_count) : 0,
    channelCreatedAt: r.channel_created_at ? String(r.channel_created_at) : null,
    metricsSyncedAt: r.metrics_synced_at ? String(r.metrics_synced_at) : null,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

export class D1CreatorRepository implements CreatorRepository {
  constructor(private db: D1Database) {}

  async findProfileByUserId(
    userId: number,
  ): Promise<(CreatorProfile & { platformAccounts: CreatorPlatformAccount[] }) | null> {
    const row = await this.db
      .prepare(`SELECT * FROM creator_profiles WHERE user_id = ?`)
      .bind(userId)
      .first<Record<string, unknown>>();

    if (!row) return null;

    const profile: CreatorProfile = {
      id: Number(row.id),
      userId: Number(row.user_id),
      status: String(row.status) as CreatorStatusType,
      featuredStatus: String(row.featured_status) as FeaturedStatusType,
      featuredReason: row.featured_reason ? String(row.featured_reason) : null,
      featuredSince: row.featured_since ? String(row.featured_since) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };

    const accRes = await this.db
      .prepare(`SELECT * FROM creator_platform_accounts WHERE creator_id = ? ORDER BY id ASC`)
      .bind(profile.id)
      .all<Record<string, unknown>>();

    const platformAccounts: CreatorPlatformAccount[] = (accRes.results || []).map(
      mapPlatformAccountRow,
    );

    return { ...profile, platformAccounts };
  }

  async findProfileById(
    creatorId: number,
  ): Promise<(CreatorProfile & { platformAccounts: CreatorPlatformAccount[] }) | null> {
    const row = await this.db
      .prepare(`SELECT * FROM creator_profiles WHERE id = ?`)
      .bind(creatorId)
      .first<Record<string, unknown>>();

    if (!row) return null;

    const profile: CreatorProfile = {
      id: Number(row.id),
      userId: Number(row.user_id),
      status: String(row.status) as CreatorStatusType,
      featuredStatus: String(row.featured_status) as FeaturedStatusType,
      featuredReason: row.featured_reason ? String(row.featured_reason) : null,
      featuredSince: row.featured_since ? String(row.featured_since) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };

    const accRes = await this.db
      .prepare(`SELECT * FROM creator_platform_accounts WHERE creator_id = ? ORDER BY id ASC`)
      .bind(creatorId)
      .all<Record<string, unknown>>();

    const platformAccounts: CreatorPlatformAccount[] = (accRes.results || []).map(
      mapPlatformAccountRow,
    );

    return { ...profile, platformAccounts };
  }

  async findPlatformAccount(
    platform: CreatorPlatformType,
    platformUserId: string,
  ): Promise<CreatorPlatformAccount | null> {
    const row = await this.db
      .prepare(
        `SELECT * FROM creator_platform_accounts WHERE platform = ? AND platform_user_id = ?`,
      )
      .bind(platform, platformUserId)
      .first<Record<string, unknown>>();

    if (!row) return null;
    return mapPlatformAccountRow(row);
  }

  async findPlatformAccountById(platformAccountId: number): Promise<CreatorPlatformAccount | null> {
    const row = await this.db
      .prepare(`SELECT * FROM creator_platform_accounts WHERE id = ?`)
      .bind(platformAccountId)
      .first<Record<string, unknown>>();

    if (!row) return null;
    return mapPlatformAccountRow(row);
  }

  async updatePlatformAccountMetrics(
    platformAccountId: number,
    input: {
      audienceCount: number | null;
      channelCreatedAt: string | null;
      syncedAt: string;
    },
  ): Promise<CreatorPlatformAccount> {
    await this.db
      .prepare(
        `UPDATE creator_platform_accounts
         SET audience_count = ?, channel_created_at = ?, metrics_synced_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        input.audienceCount,
        input.channelCreatedAt,
        input.syncedAt,
        input.syncedAt,
        platformAccountId,
      )
      .run();

    const updated = await this.findPlatformAccountById(platformAccountId);
    if (!updated) throw new Error("Failed to update platform account metrics");
    return updated;
  }

  async upsertProfile(input: {
    userId: number;
    status: CreatorStatusType;
    featuredStatus?: FeaturedStatusType;
    featuredReason?: string | null;
  }): Promise<CreatorProfile> {
    const now = new Date().toISOString();
    const existing = await this.findProfileByUserId(input.userId);

    if (existing) {
      const featStatus = input.featuredStatus ?? existing.featuredStatus;
      const featSince =
        featStatus === "NONE"
          ? null
          : existing.featuredStatus === "NONE"
            ? now
            : existing.featuredSince;

      await this.db
        .prepare(
          `UPDATE creator_profiles
           SET status = ?, featured_status = ?, featured_reason = ?, featured_since = ?, updated_at = ?
           WHERE user_id = ?`,
        )
        .bind(
          input.status,
          featStatus,
          input.featuredReason !== undefined ? input.featuredReason : existing.featuredReason,
          featSince,
          now,
          input.userId,
        )
        .run();

      return {
        id: existing.id,
        userId: input.userId,
        status: input.status,
        featuredStatus: featStatus,
        featuredReason:
          input.featuredReason !== undefined ? input.featuredReason : existing.featuredReason,
        featuredSince: featSince,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
    }

    const featStatus = input.featuredStatus ?? "NONE";
    const featSince = featStatus !== "NONE" ? now : null;

    await this.db
      .prepare(
        `INSERT INTO creator_profiles (user_id, status, featured_status, featured_reason, featured_since, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.userId,
        input.status,
        featStatus,
        input.featuredReason ?? null,
        featSince,
        now,
        now,
      )
      .run();

    const row = await this.db
      .prepare(`SELECT * FROM creator_profiles WHERE rowid = last_insert_rowid()`)
      .first<Record<string, unknown>>();

    return {
      id: Number(row?.id ?? 0),
      userId: input.userId,
      status: input.status,
      featuredStatus: featStatus,
      featuredReason: input.featuredReason ?? null,
      featuredSince: featSince,
      createdAt: now,
      updatedAt: now,
    };
  }

  async addPlatformAccount(input: {
    creatorId: number;
    platform: CreatorPlatformType;
    platformUserId: string;
    channelName: string;
    channelHandle?: string | null;
    channelUrl: string;
    avatarUrl?: string | null;
    verificationStatus?: string;
  }): Promise<CreatorPlatformAccount> {
    return this.upsertPlatformAccount(input);
  }

  async upsertPlatformAccount(input: {
    creatorId: number;
    platform: CreatorPlatformType;
    platformUserId: string;
    channelName: string;
    channelHandle?: string | null;
    channelUrl: string;
    avatarUrl?: string | null;
    verificationStatus?: string;
    audienceCount?: number;
    channelCreatedAt?: string | null;
  }): Promise<CreatorPlatformAccount> {
    const now = new Date().toISOString();
    const verStatus = input.verificationStatus ?? "VERIFIED";
    const verAt = verStatus === "VERIFIED" ? now : null;
    const existing = await this.findPlatformAccount(input.platform, input.platformUserId);

    if (existing) {
      await this.db
        .prepare(
          `UPDATE creator_platform_accounts
           SET creator_id = ?, channel_name = ?, channel_handle = ?, channel_url = ?, avatar_url = ?,
               verification_status = ?, verified_at = ?, audience_count = ?, channel_created_at = ?,
               metrics_synced_at = ?, updated_at = ?
           WHERE platform = ? AND platform_user_id = ?`,
        )
        .bind(
          input.creatorId,
          input.channelName,
          input.channelHandle ?? null,
          input.channelUrl,
          input.avatarUrl ?? null,
          verStatus,
          verAt,
          input.audienceCount ?? existing.audienceCount ?? 0,
          input.channelCreatedAt ?? existing.channelCreatedAt ?? null,
          now,
          now,
          input.platform,
          input.platformUserId,
        )
        .run();

      const updated = await this.findPlatformAccount(input.platform, input.platformUserId);
      if (updated) return updated;
    }

    await this.db
      .prepare(
        `INSERT INTO creator_platform_accounts
         (creator_id, platform, platform_user_id, channel_name, channel_handle, channel_url, avatar_url, verification_status, verified_at, audience_count, channel_created_at, metrics_synced_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        input.creatorId,
        input.platform,
        input.platformUserId,
        input.channelName,
        input.channelHandle ?? null,
        input.channelUrl,
        input.avatarUrl ?? null,
        verStatus,
        verAt,
        input.audienceCount ?? 0,
        input.channelCreatedAt ?? null,
        now,
        now,
        now,
      )
      .run();

    const row = await this.db
      .prepare(`SELECT * FROM creator_platform_accounts WHERE rowid = last_insert_rowid()`)
      .first<Record<string, unknown>>();

    if (row) return mapPlatformAccountRow(row);

    const created = await this.findPlatformAccount(input.platform, input.platformUserId);
    if (created) return created;

    throw new Error("Failed to insert platform account");
  }

  async getCreatorRankings(options: {
    mode: "score" | "xp";
    gameId?: string;
    direction?: "asc" | "desc";
    platform?: CreatorPlatformType;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: CreatorRankEntry[]; total: number }> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    const platformFilterClause = options.platform
      ? `AND cp.id IN (SELECT creator_id FROM creator_platform_accounts WHERE platform = ? AND verification_status = 'VERIFIED')`
      : "";

    if (options.mode === "score") {
      const selectedGameId = options.gameId && options.gameId !== "all" ? options.gameId : null;
      const orderClause = options.direction === "asc" ? "ASC" : "DESC";

      let query = `
        SELECT s.id, s.user_id, u.nickname, u.avatar_url, u.country, s.game_id, s.score, s.created_at,
               cp.id as creator_id, cp.featured_status
        FROM scores s
        JOIN users u ON u.id = s.user_id
        JOIN creator_profiles cp ON cp.user_id = s.user_id
        WHERE cp.status = 'VERIFIED' ${platformFilterClause}
      `;

      if (selectedGameId) {
        query += ` AND s.game_id = ?`;
      }

      query += ` ORDER BY s.score ${orderClause}, s.created_at ASC LIMIT 200`;

      const stmt = options.platform
        ? selectedGameId
          ? this.db.prepare(query).bind(options.platform, selectedGameId)
          : this.db.prepare(query).bind(options.platform)
        : selectedGameId
          ? this.db.prepare(query).bind(selectedGameId)
          : this.db.prepare(query);

      const res = await stmt.all<Record<string, unknown>>();

      const seen = new Set<number>();
      const rawCandidates: Record<string, unknown>[] = [];

      for (const row of res.results || []) {
        const userId = Number(row.user_id);
        if (isNaN(userId) || seen.has(userId)) continue;
        seen.add(userId);
        rawCandidates.push(row);
      }

      const total = rawCandidates.length;
      const page = rawCandidates.slice(offset, offset + limit);

      const creatorIds = page.map((r) => Number(r.creator_id));
      const platformMap = await this.loadPlatformsForCreators(creatorIds);

      const entries: CreatorRankEntry[] = page.map((row, idx) => {
        const gId = String(row.game_id);

        return {
          userId: Number(row.user_id),
          nickname: String(row.nickname),
          avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
          country: row.country ? String(row.country) : null,
          creatorId: Number(row.creator_id),
          featuredStatus: String(row.featured_status) as FeaturedStatusType,
          platformAccounts: platformMap.get(Number(row.creator_id)) || [],
          score: Number(row.score),
          gameId: gId,
          rank: offset + idx + 1,
        };
      });

      return { entries, total };
    } else {
      // Mode === "xp"
      const countQuery = `
        SELECT COUNT(DISTINCT cp.user_id) as total
        FROM creator_profiles cp
        JOIN user_progress up ON up.user_id = cp.user_id
        WHERE cp.status = 'VERIFIED' ${platformFilterClause}
      `;

      const countStmt = options.platform
        ? this.db.prepare(countQuery).bind(options.platform)
        : this.db.prepare(countQuery);

      const countRow = await countStmt.first<{ total: number }>();
      const total = countRow?.total ?? 0;

      const dataQuery = `
        SELECT cp.user_id, u.nickname, u.avatar_url, u.country, up.total_xp,
               cp.id as creator_id, cp.featured_status
        FROM creator_profiles cp
        JOIN users u ON u.id = cp.user_id
        JOIN user_progress up ON up.user_id = cp.user_id
        WHERE cp.status = 'VERIFIED' ${platformFilterClause}
        ORDER BY up.total_xp DESC, cp.user_id ASC
        LIMIT ? OFFSET ?
      `;

      const dataStmt = options.platform
        ? this.db.prepare(dataQuery).bind(options.platform, limit, offset)
        : this.db.prepare(dataQuery).bind(limit, offset);

      const res = await dataStmt.all<Record<string, unknown>>();
      const page = res.results || [];

      const creatorIds = page.map((r) => Number(r.creator_id));
      const platformMap = await this.loadPlatformsForCreators(creatorIds);

      const entries: CreatorRankEntry[] = page.map((row, idx) => {
        const item = row;
        const totalXp = Number(item.total_xp);

        return {
          userId: Number(item.user_id),
          nickname: String(item.nickname),
          avatarUrl: item.avatar_url ? String(item.avatar_url) : null,
          country: item.country ? String(item.country) : null,
          creatorId: Number(item.creator_id),
          featuredStatus: String(item.featured_status) as FeaturedStatusType,
          platformAccounts: platformMap.get(Number(item.creator_id)) || [],
          totalXp,
          rank: offset + idx + 1,
        };
      });

      return { entries, total };
    }
  }

  private async loadPlatformsForCreators(creatorIds: number[]): Promise<
    Map<
      number,
      Array<{
        platform: CreatorPlatformType;
        channelName: string;
        channelUrl: string;
        avatarUrl: string | null;
      }>
    >
  > {
    const map = new Map<
      number,
      Array<{
        platform: CreatorPlatformType;
        channelName: string;
        channelUrl: string;
        avatarUrl: string | null;
      }>
    >();

    if (creatorIds.length === 0) return map;

    const placeholders = creatorIds.map(() => "?").join(",");
    const query = `
      SELECT creator_id, platform, channel_name, channel_url, avatar_url
      FROM creator_platform_accounts
      WHERE verification_status = 'VERIFIED' AND creator_id IN (${placeholders})
      ORDER BY id ASC
    `;

    const res = await this.db
      .prepare(query)
      .bind(...creatorIds)
      .all<Record<string, unknown>>();

    for (const r of res.results || []) {
      const cId = Number(r.creator_id);
      const list = map.get(cId) ?? [];
      list.push({
        platform: String(r.platform) as CreatorPlatformType,
        channelName: String(r.channel_name),
        channelUrl: String(r.channel_url),
        avatarUrl: r.avatar_url ? String(r.avatar_url) : null,
      });
      map.set(cId, list);
    }

    return map;
  }
}
