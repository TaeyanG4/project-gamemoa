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
