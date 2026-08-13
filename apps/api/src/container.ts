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
