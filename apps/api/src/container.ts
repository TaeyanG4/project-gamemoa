import {
  D1UserRepository,
  D1SessionRepository,
  D1ScoreRepository,
  D1PersonalizationRepository,
  D1AccountMergeRepository,
  D1ProgressionRepository,
  D1AchievementRepository,
  D1DiscordLinkRepository,
  D1DiscordGuildRepository,
  D1CreatorRepository,
  D1CreatorReviewRepository,
  D1AdminAuthRepository,
  D1AdminAccountRepository,
  D1GameSettingsRepository,
  D1AdminMonitoringRepository,
  D1UserModerationRepository,
} from "@owogg/db";
import {
  ScoreUseCases,
  PersonalizationUseCases,
  IdentityUseCases,
  AccountMergeUseCases,
  ProgressionUseCases,
  AchievementUseCases,
  ProfileUseCases,
  DiscordLinkUseCases,
  DiscordGuildRegistrationUseCases,
  DiscordGuildDirectoryUseCases,
  DiscordGuildManagementUseCases,
  DiscordGuildXpUseCases,
  CreatorUseCases,
  AdminAuthUseCases,
  AdminAccountUseCases,
  GameSettingsUseCases,
  UserModerationUseCases,
  type UserRepository,
  type SessionRepository,
  type ScoreRepository,
  type PersonalizationRepository,
  type AccountMergeRepository,
  type ProgressionRepository,
  type AchievementRepository,
  type DiscordLinkRepository,
  type DiscordGuildRepository,
  type CreatorRepository,
  type CreatorReviewRepository,
  type AdminAuthRepository,
  type AdminAccountRepository,
  type GameSettingsRepository,
  type AdminMonitoringRepository,
  type UserModerationRepository,
} from "@owogg/core";
import type { D1Database } from "@cloudflare/workers-types";

export interface AppContainer {
  userRepo: UserRepository;
  sessionRepo: SessionRepository;
  scoreRepo: ScoreRepository;
  personalizationRepo: PersonalizationRepository;
  accountMergeRepo: AccountMergeRepository;
  progressionRepo: ProgressionRepository;
  achievementRepo: AchievementRepository;
  discordLinkRepo: DiscordLinkRepository;
  discordGuildRepo: DiscordGuildRepository;
  creatorRepo: CreatorRepository;
  creatorReviewRepo: CreatorReviewRepository;
  adminAuthRepo: AdminAuthRepository;
  adminAccountRepo: AdminAccountRepository;
  gameSettingsRepo: GameSettingsRepository;
  adminMonitoringRepo: AdminMonitoringRepository;
  userModerationRepo: UserModerationRepository;

  scoreUseCases: ScoreUseCases;
  personalizationUseCases: PersonalizationUseCases;
  identityUseCases: IdentityUseCases;
  accountMergeUseCases: AccountMergeUseCases;
  progressionUseCases: ProgressionUseCases;
  achievementUseCases: AchievementUseCases;
  profileUseCases: ProfileUseCases;
  discordLinkUseCases: DiscordLinkUseCases;
  discordGuildRegistrationUseCases: DiscordGuildRegistrationUseCases;
  discordGuildDirectoryUseCases: DiscordGuildDirectoryUseCases;
  discordGuildManagementUseCases: DiscordGuildManagementUseCases;
  discordGuildXpUseCases: DiscordGuildXpUseCases;
  creatorUseCases: CreatorUseCases;
  adminAuthUseCases: AdminAuthUseCases;
  adminAccountUseCases: AdminAccountUseCases;
  gameSettingsUseCases: GameSettingsUseCases;
  userModerationUseCases: UserModerationUseCases;
}

export function createContainer(db: D1Database): AppContainer {
  const userRepo = new D1UserRepository(db);
  const sessionRepo = new D1SessionRepository(db);
  const scoreRepo = new D1ScoreRepository(db);
  const personalizationRepo = new D1PersonalizationRepository(db);
  const accountMergeRepo = new D1AccountMergeRepository(db);
  const progressionRepo = new D1ProgressionRepository(db);
  const achievementRepo = new D1AchievementRepository(db);
  const discordLinkRepo = new D1DiscordLinkRepository(db);
  const discordGuildRepo = new D1DiscordGuildRepository(db);
  const creatorRepo = new D1CreatorRepository(db);
  const creatorReviewRepo = new D1CreatorReviewRepository(db);
  const adminAuthRepo = new D1AdminAuthRepository(db);
  const adminAccountRepo = new D1AdminAccountRepository(db);
  const gameSettingsRepo = new D1GameSettingsRepository(db);
  const adminMonitoringRepo = new D1AdminMonitoringRepository(db);
  const userModerationRepo = new D1UserModerationRepository(db);

  const scoreUseCases = new ScoreUseCases(scoreRepo);
  const personalizationUseCases = new PersonalizationUseCases(personalizationRepo);
  const identityUseCases = new IdentityUseCases(userRepo);
  const accountMergeUseCases = new AccountMergeUseCases(
    accountMergeRepo,
    userRepo,
    adminAccountRepo,
  );
  const progressionUseCases = new ProgressionUseCases(progressionRepo);
  const achievementUseCases = new AchievementUseCases(achievementRepo);
  const profileUseCases = new ProfileUseCases(userRepo);
  const discordLinkUseCases = new DiscordLinkUseCases(discordLinkRepo);
  const discordGuildRegistrationUseCases = new DiscordGuildRegistrationUseCases(discordGuildRepo);
  const discordGuildDirectoryUseCases = new DiscordGuildDirectoryUseCases(discordGuildRepo);
  const discordGuildManagementUseCases = new DiscordGuildManagementUseCases(discordGuildRepo);
  const discordGuildXpUseCases = new DiscordGuildXpUseCases(discordGuildRepo, userRepo);
  const creatorUseCases = new CreatorUseCases(creatorRepo, creatorReviewRepo);
  const adminAuthUseCases = new AdminAuthUseCases(adminAuthRepo);
  const adminAccountUseCases = new AdminAccountUseCases(adminAccountRepo, adminAuthRepo);
  const gameSettingsUseCases = new GameSettingsUseCases(gameSettingsRepo);
  const userModerationUseCases = new UserModerationUseCases(
    userModerationRepo,
    sessionRepo,
    userRepo,
  );

  return {
    userRepo,
    sessionRepo,
    scoreRepo,
    personalizationRepo,
    accountMergeRepo,
    progressionRepo,
    achievementRepo,
    discordLinkRepo,
    discordGuildRepo,
    creatorRepo,
    creatorReviewRepo,
    adminAuthRepo,
    adminAccountRepo,
    gameSettingsRepo,
    adminMonitoringRepo,
    userModerationRepo,

    scoreUseCases,
    personalizationUseCases,
    identityUseCases,
    accountMergeUseCases,
    progressionUseCases,
    achievementUseCases,
    profileUseCases,
    discordLinkUseCases,
    discordGuildRegistrationUseCases,
    discordGuildDirectoryUseCases,
    discordGuildManagementUseCases,
    discordGuildXpUseCases,
    creatorUseCases,
    adminAuthUseCases,
    adminAccountUseCases,
    gameSettingsUseCases,
    userModerationUseCases,
  };
}

/**
 * Shared orchestration used by any route that may newly satisfy an achievement
 * (accepted game completion, adding a Favorite, ...). Gathers the current facts from the
 * already-composed use cases and delegates the actual eligibility/unlock decision to
 * AchievementUseCases, which stays the single source of truth for achievement rules.
 */
export async function evaluateAchievementsForUser(
  container: AppContainer,
  userId: number,
): Promise<string[]> {
  const [progress, bests, personalization] = await Promise.all([
    container.progressionUseCases.getProgressionSummary(userId),
    container.scoreUseCases.getUserBests(userId),
    container.personalizationUseCases.getPersonalizationState(userId),
  ]);

  return container.achievementUseCases.evaluateAndUnlock(userId, {
    eligibleCompletions: progress.eligibleCompletions,
    level: progress.summary.level,
    hasFavorite: personalization.favoriteGameIds.length > 0,
    playedGameIds: Object.keys(bests),
  });
}

/**
 * Aggregates the public-safe subset of a user's data for the public profile page
 * (GET /api/profile/public/:userId, no auth). Deliberately narrower than everything
 * evaluateAchievementsForUser/the private /profile page can see — never includes email,
 * linked-provider list, or unverified/pending creator platform attempts.
 */
export async function getPublicProfileData(
  container: AppContainer,
  userId: number,
  /** The currently-authenticated viewer's user id, if any — null for guests. Used only to
   * decide (a) whether to bypass the owner's own favorites/recent-plays privacy flags (owners
   * always see their own lists) and (b) whether to include visibilitySettings at all (only
   * ever returned to the owner). Never affects any other field. */
  viewerId: number | null,
): Promise<{
  id: number;
  nickname: string;
  avatarUrl: string | null;
  country: string | null;
  joinedAt: string;
  progression: import("@owogg/core").ProgressionSummary;
  globalRank: number | null;
  currentStreak: number;
  longestStreak: number;
  unlockedAchievementCodes: string[];
  totalAchievements: number;
  gameBests: Array<{ gameId: string; score: number; formattedScore: string }>;
  creatorBadges: Array<{
    platform: string;
    channelName: string;
    channelUrl: string;
    channelHandle: string | null;
  }>;
  favoriteGameIds: string[] | null;
  recentPlays: Array<{ gameId: string; lastPlayedAt: string }> | null;
  visibilitySettings: { showFavorites: boolean; showRecentPlays: boolean } | null;
} | null> {
  const user = await container.userRepo.findById(userId);
  if (!user) return null;

  const isOwner = viewerId !== null && viewerId === userId;
  const showFavorites = user.show_favorites ?? false;
  const showRecentPlays = user.show_recent_plays ?? false;
  const needsPersonalization = isOwner || showFavorites || showRecentPlays;

  const [progress, globalRank, achievements, gameBests, creatorProfile, personalization] =
    await Promise.all([
      container.progressionUseCases.getProgressionSummary(userId),
      container.progressionUseCases.getGlobalXpRank(userId),
      container.achievementUseCases.getSummary(userId),
      container.scoreUseCases.getUserBestsFormatted(userId),
      container.creatorUseCases.getCreatorProfileByUserId(userId),
      needsPersonalization
        ? container.personalizationUseCases.getPersonalizationState(userId)
        : null,
    ]);

  const creatorBadges = (creatorProfile?.platformAccounts ?? [])
    .filter((a) => a.verificationStatus === "VERIFIED")
    .map((a) => ({
      platform: a.platform,
      channelName: a.channelName,
      channelUrl: a.channelUrl,
      channelHandle: a.channelHandle,
    }));

  return {
    id: user.id,
    nickname: user.nickname,
    avatarUrl: user.avatar_url,
    country: user.country ?? null,
    joinedAt: user.created_at,
    progression: progress.summary,
    globalRank,
    currentStreak: user.current_streak ?? 0,
    longestStreak: user.longest_streak ?? 0,
    unlockedAchievementCodes: achievements.unlockedCodes,
    totalAchievements: achievements.totalAchievements,
    gameBests,
    creatorBadges,
    favoriteGameIds: isOwner || showFavorites ? (personalization?.favoriteGameIds ?? []) : null,
    recentPlays: isOwner || showRecentPlays ? (personalization?.recentPlays ?? []) : null,
    visibilitySettings: isOwner ? { showFavorites, showRecentPlays } : null,
  };
}
