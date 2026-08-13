export interface User {
  id: number;
  nickname: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  providers?: string[];
  /** Self-reported ISO 3166-1 alpha-2 code ("국가/지역"), or null if unset. Not verified nationality. */
  country?: string | null;
  /** Timestamp of the last explicit nickname change; null before the first change. */
  nickname_updated_at?: string | null;
  /** Timestamp of the last explicit country/region change; null before the first change. */
  country_updated_at?: string | null;
}

export interface OAuthAccount {
  id: number;
  user_id: number;
  provider: string;
  provider_user_id: string;
  provider_email: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: number;
  created_at: string;
  expires_at: string;
}

export interface Score {
  id: number;
  user_id: number;
  nickname: string;
  avatar_url: string | null;
  game_id: string;
  score: number;
  created_at: string;
}

export interface UserPersonalBestAggregate {
  game_id: string;
  min_score: number;
  max_score: number;
}

export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByOAuth(provider: string, providerUserId: string): Promise<User | null>;
  findOrCreateUser(data: {
    provider: string;
    providerUserId: string;
    email: string | null;
    nickname: string;
    avatarUrl: string | null;
  }): Promise<User>;
  getOAuthAccounts(userId: number): Promise<OAuthAccount[]>;
  findOAuthAccount(provider: string, providerUserId: string): Promise<OAuthAccount | null>;
  linkOAuthAccount(
    userId: number,
    provider: string,
    providerUserId: string,
    providerEmail: string | null,
  ): Promise<void>;
  unlinkOAuthAccount(userId: number, provider: string): Promise<void>;
  updateNickname(userId: number, nickname: string, updatedAt: string): Promise<User>;
  updateCountry(userId: number, country: string | null, updatedAt: string): Promise<User>;
}

export interface SessionRepository {
  createSession(userId: number, ttlDays?: number): Promise<Session>;
  findSession(sessionId: string): Promise<{ session: Session; user: User } | null>;
  deleteSession(sessionId: string): Promise<void>;
}

export interface ScoreRepository {
  saveScore(data: {
    userId: number;
    nickname: string;
    avatarUrl?: string | null;
    gameId: string;
    score: number;
  }): Promise<Score>;
  getLeaderboard(gameId: string, limit?: number, direction?: "asc" | "desc"): Promise<Score[]>;
  getUserPersonalBests(userId: number): Promise<UserPersonalBestAggregate[]>;
}

export interface FavoriteItem {
  user_id: number;
  game_id: string;
  created_at: string;
}

export interface RecentPlayItem {
  user_id: number;
  game_id: string;
  last_played_at: string;
}

export interface PersonalizationRepository {
  getFavorites(userId: number): Promise<string[]>;
  addFavorite(userId: number, gameId: string): Promise<void>;
  removeFavorite(userId: number, gameId: string): Promise<void>;

  getRecentPlays(
    userId: number,
    limit?: number,
  ): Promise<{ gameId: string; lastPlayedAt: string }[]>;
  recordRecentPlay(userId: number, gameId: string, playedAt?: string): Promise<void>;

  importGuestData(
    userId: number,
    guestRecentPlays: { gameId: string; lastPlayedAt: string }[],
  ): Promise<void>;
}

export interface MergePreview {
  userId: number;
  nickname: string;
  provider: string;
  createdAt: string;
  scoreCount: number;
  favoriteCount: number;
  recentPlayCount: number;
}

export interface MergeChallenge {
  id: string;
  userA: number;
  userB: number;
  provider: string;
  providerUserId: string;
  expiresAt: string;
  consumedAt: string | null;
}

export interface AccountMergeRepository {
  getAccountMergePreview(userId: number): Promise<MergePreview>;
  createMergeChallenge(input: {
    userA: number;
    userB: number;
    provider: string;
    providerUserId: string;
    ttlSeconds: number;
  }): Promise<{ id: string; expiresAt: string }>;
  findMergeChallenge(id: string): Promise<MergeChallenge | null>;
  findPendingMergeChallenge(userA: number, userB: number): Promise<MergeChallenge | null>;
  consumeMergeChallenge(id: string): Promise<void>;
  mergeAccounts(primaryId: number, secondaryId: number): Promise<void>;
}

// ---------------------------------------------------------------------------
// Progression (XP / Level)
// ---------------------------------------------------------------------------

export interface UserProgress {
  user_id: number;
  total_xp: number;
  eligible_completions: number;
  updated_at: string;
}

export interface RecordCompletionOutcome {
  /** True when this exact source event was already recorded (idempotent no-op). */
  duplicate: boolean;
  /** 0 when duplicate, or when the daily per-user/per-game XP cap was already reached. */
  xpAwarded: number;
  totalXp: number;
  eligibleCompletions: number;
  xpEventId?: number | undefined;
}

export interface XpLeaderboardEntry {
  userId: number;
  nickname: string;
  avatarUrl: string | null;
  totalXp: number;
}

export interface ProgressionRepository {
  /**
   * Records one accepted, authenticated, XP-eligible game completion. Idempotent by
   * (sourceType, sourceId): replaying the same source event never re-awards XP or
   * re-increments eligibleCompletions. Applies the caller-supplied daily cap by only
   * awarding `xpPerCompletion` XP while fewer than `dailyCapPerGame` XP-awarding
   * completions have already been recorded for this user+game in the current UTC day.
   */
  recordGameCompletion(input: {
    userId: number;
    gameId: string;
    sourceType: string;
    sourceId: string;
    xpPerCompletion: number;
    dailyCapPerGame: number;
  }): Promise<RecordCompletionOutcome>;

  getUserProgress(userId: number): Promise<UserProgress | null>;
  getXpLeaderboard(limit: number): Promise<XpLeaderboardEntry[]>;
  /** 1-based global rank by total_xp, or null if the user has no progress row yet. */
  getGlobalXpRank(userId: number): Promise<number | null>;
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export interface UnlockedAchievement {
  achievementCode: string;
  unlockedAt: string;
}

export interface AchievementRepository {
  getUnlockedAchievements(userId: number): Promise<UnlockedAchievement[]>;
  /** Idempotent: `unlocked` is false if the code was already unlocked for this user. */
  unlockAchievement(userId: number, code: string): Promise<{ unlocked: boolean }>;
}

// ---------------------------------------------------------------------------
// Discord account-linking challenges (/gamemoa link)
// ---------------------------------------------------------------------------

export interface DiscordLinkChallenge {
  discordUserId: string;
  discordUsername: string;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
}

export interface DiscordLinkRepository {
  /** Generates a random single-use token internally, persists only its hash, and returns
   * the raw token (shown to the Discord user exactly once, inside an ephemeral message). */
  createChallenge(input: {
    discordUserId: string;
    discordUsername: string;
    ttlSeconds: number;
  }): Promise<{ token: string; expiresAt: string }>;
  /** Looks up by the raw token; the repository hashes internally to match stored data. */
  findChallengeByToken(token: string): Promise<DiscordLinkChallenge | null>;
  consumeChallengeByToken(token: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Discord Guild Registration & Management (Phase G)
// ---------------------------------------------------------------------------

export type DiscordGuildVisibility = "PUBLIC" | "UNLISTED" | "PRIVATE";
export type DiscordGuildRegistrationStatus = "ACTIVE" | "DISABLED";

export interface DiscordGuild {
  guild_id: string;
  slug: string;
  name: string;
  icon_url: string | null;
  description: string | null;
  visibility: DiscordGuildVisibility;
  registration_status: DiscordGuildRegistrationStatus;
  registered_by_user_id: number;
  registered_at: string;
  first_seen_at: string;
  last_seen_at: string;
  updated_at: string;
}

export interface DiscordGuildManager {
  guild_id: string;
  user_id: number;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface DiscordCandidateGuild {
  guildId: string;
  name: string;
  iconUrl: string | null;
}

export interface DiscordRegistrationChallenge {
  tokenHash: string;
  userId: number;
  manageableGuilds: DiscordCandidateGuild[];
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
}

export interface DiscordPlayContext {
  tokenHash: string;
  guildId: string;
  discordUserId: string;
  userId: number;
  gameId: string | null;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
}

export interface DiscordGuildXpEvent {
  id: number;
  guildId: string;
  userId: number;
  sourceXpEventId: number;
  amount: number;
  createdAt: string;
}

export interface GuildXpLeaderboardEntry {
  userId: number;
  nickname: string;
  avatarUrl: string | null;
  xp: number;
  rank: number;
}

export interface GlobalGuildRankEntry {
  guildId: string;
  slug: string;
  name: string;
  iconUrl: string | null;
  totalXp: number;
  weeklyXp: number;
  participantCount: number;
  rank: number;
}

export interface ServerGameLeaderboardEntry {
  id: number;
  userId: number;
  nickname: string;
  avatarUrl: string | null;
  gameId: string;
  score: number;
  formattedScore: string;
  createdAt: string;
}

export interface GuildSummaryData {
  totalXp: number;
  weeklyXp: number;
  participantCount: number;
}

export interface DiscordGuildRepository {
  createRegistrationChallenge(input: {
    userId: number;
    manageableGuilds: DiscordCandidateGuild[];
    ttlSeconds?: number;
  }): Promise<{ token: string; expiresAt: string }>;
  findRegistrationChallengeByToken(token: string): Promise<DiscordRegistrationChallenge | null>;
  consumeRegistrationChallengeByToken(token: string): Promise<void>;

  registerGuild(input: {
    guildId: string;
    slug: string;
    name: string;
    iconUrl?: string | null;
    description?: string | null;
    visibility: DiscordGuildVisibility;
    userId: number;
  }): Promise<DiscordGuild>;

  findByGuildId(guildId: string): Promise<DiscordGuild | null>;
  findBySlug(slug: string): Promise<DiscordGuild | null>;

  updateGuild(
    guildId: string,
    updates: {
      slug?: string | undefined;
      description?: string | null | undefined;
      visibility?: DiscordGuildVisibility | undefined;
      registrationStatus?: DiscordGuildRegistrationStatus | undefined;
      name?: string | undefined;
      iconUrl?: string | null | undefined;
    },
  ): Promise<DiscordGuild>;

  searchPublicGuilds(
    query?: string,
    limit?: number,
    offset?: number,
  ): Promise<{ guilds: DiscordGuild[]; total: number }>;

  isGuildManager(guildId: string, userId: number): Promise<boolean>;
  addGuildManager(guildId: string, userId: number, role?: string): Promise<void>;
  getUserManagedGuilds(userId: number): Promise<DiscordGuild[]>;

  createPlayContext(input: {
    guildId: string;
    discordUserId: string;
    userId: number;
    gameId?: string | null;
    ttlSeconds?: number;
  }): Promise<{ token: string; expiresAt: string }>;
  findPlayContextByToken(token: string): Promise<DiscordPlayContext | null>;
  consumePlayContextByToken(token: string): Promise<void>;

  attributeGuildXp(input: {
    guildId: string;
    userId: number;
    sourceXpEventId: number;
    amount: number;
  }): Promise<DiscordGuildXpEvent | null>;

  getGuildUserXp(guildId: string, userId: number): Promise<number>;
  getGuildTotalXp(guildId: string): Promise<number>;

  // Phase H2 Query Methods
  getGuildXpLeaderboard(
    guildId: string,
    startOfWeekIso?: string,
    limit?: number,
    offset?: number,
  ): Promise<{ entries: GuildXpLeaderboardEntry[]; total: number }>;

  getGuildSummary(guildId: string, startOfWeekIso: string): Promise<GuildSummaryData>;

  getGlobalGuildActivityRanking(
    startOfWeekIso?: string,
    limit?: number,
    offset?: number,
  ): Promise<{ guilds: GlobalGuildRankEntry[]; total: number }>;

  getGuildGameLeaderboard(
    guildId: string,
    gameId: string,
    direction?: "asc" | "desc",
    limit?: number,
  ): Promise<ServerGameLeaderboardEntry[]>;

  getGuildUserXpRank(
    guildId: string,
    userId: number,
    startOfWeekIso?: string,
  ): Promise<{ totalXp: number; rank: number | null }>;
}

export type CreatorPlatformType = "YOUTUBE" | "CHZZK" | "SOOP" | "TWITCH";
export type CreatorStatusType = "UNVERIFIED" | "VERIFIED" | "SUSPENDED";
export type FeaturedStatusType = "NONE" | "FEATURED" | "PARTNER";
export type CreatorReviewType = "ACQUISITION" | "REVALIDATION";
export type CreatorReviewAction = "APPROVE_FEATURED" | "REJECT_FEATURED" | "KEEP_FOR_REVIEW";

export interface CreatorProfile {
  id: number;
  userId: number;
  status: CreatorStatusType;
  featuredStatus: FeaturedStatusType;
  featuredReason: string | null;
  featuredSince: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorPlatformAccount {
  id: number;
  creatorId: number;
  platform: CreatorPlatformType;
  platformUserId: string;
  channelName: string;
  channelHandle: string | null;
  channelUrl: string;
  avatarUrl: string | null;
  verificationStatus: string;
  verifiedAt: string | null;
  audienceCount?: number;
  channelCreatedAt?: string | null;
  metricsSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorRankEntry {
  userId: number;
  nickname: string;
  avatarUrl: string | null;
  country: string | null;
  creatorId: number;
  featuredStatus: FeaturedStatusType;
  platformAccounts: Array<{
    platform: CreatorPlatformType;
    channelName: string;
    channelUrl: string;
    avatarUrl: string | null;
  }>;
  score?: number | undefined;
  formattedScore?: string | undefined;
  gameId?: string | undefined;
  gameTitle?: string | undefined;
  totalXp?: number | undefined;
  level?: number | undefined;
  rank: number;
}

export type CreatorReviewJobStatus =
  | "AUTO_REVIEW_PENDING"
  | "FEATURED"
  | "NOT_ELIGIBLE"
  | "MANUAL_REVIEW"
  | "FAILED_RETRYABLE"
  | "REVALIDATION_PENDING"
  | "REVALIDATION_FAILED_RETRYABLE";

export interface CreatorReviewJob {
  id: number;
  creatorPlatformAccountId: number;
  reviewType: CreatorReviewType;
  status: CreatorReviewJobStatus;
  initialAudience: number | null;
  initialChannelCreatedAt: string | null;
  nextCheckAt: string;
  attemptCount: number;
  lastError: string | null;
  reviewReason: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface CreatorManualReviewItem {
  job: CreatorReviewJob;
  userId: number;
  nickname: string;
  creatorId: number;
  creatorStatus: CreatorStatusType;
  featuredStatus: FeaturedStatusType;
  platformAccount: CreatorPlatformAccount;
}

export interface CreatorReviewMetricSnapshot {
  platform: CreatorPlatformType;
  channelName: string;
  channelUrl: string;
  verificationStatus: string;
  audienceCount: number | null;
  channelCreatedAt: string | null;
  metricsSyncedAt: string | null;
}

export interface CreatorReviewAuditLog {
  id: number;
  creatorPlatformAccountId: number;
  reviewJobId: number | null;
  reviewerUserId: number;
  action: CreatorReviewAction;
  reason: string;
  previousStatus: CreatorReviewJobStatus;
  newStatus: CreatorReviewJobStatus;
  metricSnapshot: CreatorReviewMetricSnapshot | null;
  createdAt: string;
  platform?: CreatorPlatformType | undefined;
  channelName?: string | undefined;
}

export interface CreatorReviewQueueResult {
  items: CreatorManualReviewItem[];
  total: number;
}

export interface CreatorReviewAuditResult {
  entries: CreatorReviewAuditLog[];
  total: number;
}

export type CreatorManualReviewFailureCode =
  "NOT_FOUND" | "ALREADY_DECIDED" | "OWNERSHIP_NOT_VERIFIED" | "ALREADY_APPLIED" | "INVALID_REASON";

export interface CreatorManualReviewDecisionResult {
  applied: boolean;
  code?: CreatorManualReviewFailureCode;
  previousStatus: CreatorReviewJobStatus | null;
  newStatus: CreatorReviewJobStatus | null;
}

export interface CreatorReviewRepository {
  /** 가장 최근 심사/재심사 결과 (프로필 단위 프레젠테이션용). */
  findLatestJobByAccountIds(creatorPlatformAccountIds: number[]): Promise<CreatorReviewJob | null>;
  /** 아직 활성 상태(진행/재시도 대기)인 계정의 잡을 조회. */
  findActiveJobByAccountId(creatorPlatformAccountId: number): Promise<CreatorReviewJob | null>;
  /** 계정별 최신 재검증 잡을 조회합니다. */
  findLatestRevalidationJobByAccountId(
    creatorPlatformAccountId: number,
  ): Promise<CreatorReviewJob | null>;
  /** 활성 잡이 없으면 신규 생성, 있으면 스냅샷/다음 심사 시각을 리셋(멱등). */
  createOrResetJob(input: {
    creatorPlatformAccountId: number;
    initialAudience: number | null;
    initialChannelCreatedAt: string | null;
    nextCheckAt: string;
  }): Promise<CreatorReviewJob>;
  /** 기존 Featured Creator의 14일 재검증 잡을 멱등적으로 예약합니다. */
  scheduleRevalidationJob(input: {
    creatorPlatformAccountId: number;
    nextCheckAt: string;
    nowIso: string;
  }): Promise<CreatorReviewJob>;
  /** 기존 Featured 계정 중 재검증 잡이 없는 계정을 제한된 수만큼 보충합니다. */
  ensureRevalidationJobs(limit: number, nextCheckAt: string, nowIso: string): Promise<number>;
  /** 예정 시각이 지난 진행/재시도 잡을 바운디드 배치로 조회 (unbounded scan 금지). */
  listDuePendingJobs(limit: number, nowIso: string): Promise<CreatorReviewJob[]>;
  /** 14일 재검증 잡만 조회합니다 (6시간 취득 파이프라인과 분리). */
  listDueRevalidationJobs(limit: number, nowIso: string): Promise<CreatorReviewJob[]>;
  /** 재시도 가능 실패 기록. attempt_count 1 증가. */
  markJobFailed(id: number, error: string, nextCheckAt: string, nowIso: string): Promise<void>;
  /**
   * 잡을 종결 상태로 전이. 동시 실행/중복 실행 시 이미 전이된 잡은 false 반환(멱등).
   * 성공 시에만 호출자가 Featured 프로필 전이를 수행해야 합니다.
   */
  completeJob(
    id: number,
    status: Exclude<
      CreatorReviewJobStatus,
      | "AUTO_REVIEW_PENDING"
      | "FAILED_RETRYABLE"
      | "REVALIDATION_PENDING"
      | "REVALIDATION_FAILED_RETRYABLE"
    >,
    completedAt: string,
    reason?: string,
  ): Promise<boolean>;
  listManualReviewQueue(limit: number, offset: number): Promise<CreatorReviewQueueResult>;
  listAuditLogs(limit: number, offset: number): Promise<CreatorReviewAuditResult>;
  applyManualReviewDecision(input: {
    jobId: number;
    reviewerUserId: number;
    action: CreatorReviewAction;
    reason: string;
    publicProfileReason: string;
    nextRevalidationAt: string;
    nowIso: string;
  }): Promise<CreatorManualReviewDecisionResult>;
}

export interface CreatorRepository {
  findProfileByUserId(
    userId: number,
  ): Promise<(CreatorProfile & { platformAccounts: CreatorPlatformAccount[] }) | null>;
  findProfileById(
    creatorId: number,
  ): Promise<(CreatorProfile & { platformAccounts: CreatorPlatformAccount[] }) | null>;
  findPlatformAccountById(platformAccountId: number): Promise<CreatorPlatformAccount | null>;
  findPlatformAccount(
    platform: CreatorPlatformType,
    platformUserId: string,
  ): Promise<CreatorPlatformAccount | null>;
  upsertProfile(input: {
    userId: number;
    status: CreatorStatusType;
    featuredStatus?: FeaturedStatusType;
    featuredReason?: string | null;
  }): Promise<CreatorProfile>;
  addPlatformAccount(input: {
    creatorId: number;
    platform: CreatorPlatformType;
    platformUserId: string;
    channelName: string;
    channelHandle?: string | null;
    channelUrl: string;
    avatarUrl?: string | null;
    verificationStatus?: string;
  }): Promise<CreatorPlatformAccount>;
  upsertPlatformAccount(input: {
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
  }): Promise<CreatorPlatformAccount>;
  /** 스케줄 재심사 성공 시 공식 지표를 갱신하고 metrics_synced_at를 갱신합니다. */
  updatePlatformAccountMetrics(
    platformAccountId: number,
    input: {
      audienceCount: number | null;
      channelCreatedAt: string | null;
      syncedAt: string;
    },
  ): Promise<CreatorPlatformAccount>;
  getCreatorRankings(options: {
    mode: "score" | "xp";
    gameId?: string;
    direction?: "asc" | "desc";
    platform?: CreatorPlatformType;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: CreatorRankEntry[]; total: number }>;
}
