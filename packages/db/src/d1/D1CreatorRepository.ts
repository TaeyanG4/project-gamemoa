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

    const platformAccounts: CreatorPlatformAccount[] = (accRes.results || []).map((r) => ({
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
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));

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

    const platformAccounts: CreatorPlatformAccount[] = (accRes.results || []).map((r) => ({
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
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));

    return { ...profile, platformAccounts };
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
        featStatus !== "NONE" && existing.featuredStatus === "NONE" ? now : existing.featuredSince;

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
    const now = new Date().toISOString();
    const verStatus = input.verificationStatus ?? "VERIFIED";
    const verAt = verStatus === "VERIFIED" ? now : null;

    await this.db
      .prepare(
        `INSERT INTO creator_platform_accounts
         (creator_id, platform, platform_user_id, channel_name, channel_handle, channel_url, avatar_url, verification_status, verified_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        now,
        now,
      )
      .run();

    const row = await this.db
      .prepare(`SELECT * FROM creator_platform_accounts WHERE rowid = last_insert_rowid()`)
      .first<Record<string, unknown>>();

    return {
      id: Number(row?.id ?? 0),
      creatorId: input.creatorId,
      platform: input.platform,
      platformUserId: input.platformUserId,
      channelName: input.channelName,
      channelHandle: input.channelHandle ?? null,
      channelUrl: input.channelUrl,
      avatarUrl: input.avatarUrl ?? null,
      verificationStatus: verStatus,
      verifiedAt: verAt,
      createdAt: now,
      updatedAt: now,
    };
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
        query += ` AND s.game_id = '${selectedGameId}'`;
      }

      query += ` ORDER BY s.score ${orderClause}, s.created_at ASC LIMIT 200`;

      const stmt = options.platform
        ? this.db.prepare(query).bind(options.platform)
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
