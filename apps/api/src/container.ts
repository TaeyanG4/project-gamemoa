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
  D1GameCreatorRepository,
  D1SandboxGameRepository,
  D1GameAttemptConsumptionRepository,
  D1CreatorScoreAcceptanceRepository,
  BackblazeB2GameBundleRepository,
  UnconfiguredGameBundleRepository,
  B2CreatorGameDefinitionRepository,
  B2GameCanonicalRepository,
  type BackblazeB2Config,
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
  GameCreatorUseCases,
  SandboxGameUseCases,
  GameAttemptUseCases,
  CreatorScoreAcceptanceUseCases,
  CreatorLeaderboardUseCases,
  GameBundlePublisher,
  StaticGameRegistry,
  GAME_DEFINITIONS,
  type GameRegistry,
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
  type GameCreatorAccessRepository,
  type GameCreatorApplicationRepository,
  type SandboxGameRepository,
  type GameBundleStorageRepository,
  type GameAttemptConsumptionRepository,
  type CreatorScoreAcceptanceRepository,
  type CreatorGameDefinitionRepository,
  type GameCanonicalRepository,
} from "@owogg/core";
import type { D1Database } from "@cloudflare/workers-types";
import { FflateBundleArchiveReader } from "./infrastructure/games/FflateBundleArchiveReader.js";

/**
 * Built once from the compiled game-registry/ output (packages/core/src/registry/
 * gameDefinitions.generated.ts), not per `createContainer` call — SYSTEM games are fixed at
 * deploy time, so there is nothing request-specific to rebuild the way the D1-backed repositories
 * below need a fresh handle each call. Held to agreement with GAME_MANIFESTS by `pnpm
 * registry:check` (scripts/registry-builder.ts's assertDefinitionsMatchManifests), so this is
 * behaviourally the same catalog ScoreUseCases/GameSettingsUseCases resolved through
 * GAME_MANIFEST_MAP/GAME_MANIFESTS before.
 *
 * Exported directly (not only reachable via `createContainer(db).gameRegistry`) because it
 * genuinely needs no `db` argument to exist — a route that only wants to resolve a game id
 * (routes/scores.ts's leaderboard gameId validation, in particular) can import this without first
 * needing a D1 binding to be present, matching the validation-before-DB-check ordering that route
 * already had.
 */
export const gameRegistry: GameRegistry = new StaticGameRegistry(GAME_DEFINITIONS);

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
  /** Implements both GameCreatorAccessRepository and GameCreatorApplicationRepository — see
   * D1GameCreatorRepository's doc comment for why they share one D1 class. */
  gameCreatorRepo: GameCreatorAccessRepository & GameCreatorApplicationRepository;
  sandboxGameRepo: SandboxGameRepository;
  /** Runtime-only replay protection for a Game Session's attemptId (migration 0028) — not
   * canonical game/creator metadata, and not yet consulted by any route (see
   * GameAttemptUseCases's own doc comment). */
  gameAttemptRepo: GameAttemptConsumptionRepository;
  /** Atomic attempt-consume + score-save for Creator games (migration 0028's table again, plus
   * `scores`) — see CreatorScoreAcceptanceRepository's own doc comment for why this is a
   * separate port from gameAttemptRepo above rather than an extension of it. */
  creatorScoreAcceptanceRepo: CreatorScoreAcceptanceRepository;
  gameBundleStorageRepo: GameBundleStorageRepository;
  /** True only when a complete Backblaze B2 config was passed to createContainer — routes should
   * check this (rather than try/catch-ing putBundle) to return a clean 503 before touching the
   * use case. */
  gameBundlesConfigured: boolean;
  /** Stage C-2's B2 canonical write-through target — composed from the SAME `gameBundleStorageRepo`
   * above (no new B2 client; see B2CreatorGameDefinitionRepository's own doc comment), so it is
   * only really backed by B2 when `gameBundlesConfigured` is true. A route calling
   * `sandboxGameUseCases.updateMetadata` must check `gameBundlesConfigured` itself and return a
   * clean 503 before doing so — same convention as `gameBundleStorageRepo`, never a silent
   * D1-only fallback (see adminSandboxGames.ts's metadata PATCH route). */
  creatorGameDefinitionRepo: CreatorGameDefinitionRepository;
  /** Stage U-3's generic canonical SHADOW write target — composed from the SAME
   * `gameBundleStorageRepo` above as `creatorGameDefinitionRepo` (no second B2 client; see
   * B2GameCanonicalRepository's own doc comment), so it too is only really backed by B2 when
   * `gameBundlesConfigured` is true. `creatorGameDefinitionRepo` (Creator canonical) remains
   * AUTHORITATIVE this Stage — `sandboxGameUseCases.updateMetadata` only ever writes here as a
   * projection of what that repository already holds (see that method's own doc comment); nothing
   * else in this container reads or writes this repository yet. */
  gameCanonicalRepo: GameCanonicalRepository;
  /** SYSTEM games only today (game-registry/, compiled to GAME_DEFINITIONS) — a creator-owned
   * game is not "missing" from here so much as out of scope, see StaticGameRegistry's doc
   * comment. Exposed on the container, not just threaded privately into ScoreUseCases/
   * GameSettingsUseCases, so a future route that needs to resolve a game directly has one place
   * to get it from rather than reaching back into a generated file. */
  gameRegistry: GameRegistry;

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
  gameCreatorUseCases: GameCreatorUseCases;
  sandboxGameUseCases: SandboxGameUseCases;
  gameAttemptUseCases: GameAttemptUseCases;
  creatorScoreAcceptanceUseCases: CreatorScoreAcceptanceUseCases;
  creatorLeaderboardUseCases: CreatorLeaderboardUseCases;
  gameBundlePublisher: GameBundlePublisher;
}

/**
 * `b2Config` is the optional Backblaze B2 credential/endpoint bundle (B2_ENDPOINT/B2_REGION/
 * B2_BUCKET_NAME/B2_KEY_ID/B2_APPLICATION_KEY — see apps/api/src/routes/auth.ts's ApiEnv and
 * apps/api/src/routes/devGames.ts's `readB2Config`), absent in any environment that hasn't set
 * those secrets yet. Unlike the R2 binding this replaced, B2 access is plain HTTPS (via
 * aws4fetch) rather than a Cloudflare binding declared in wrangler.jsonc — so there is no
 * resource that must exist before `wrangler deploy` will succeed; an unconfigured environment
 * just boots with uploads disabled. Every other dependency this container needs is D1-only; B2
 * config is the one exception, threaded through explicitly rather than via `c.env` reads
 * scattered across routes, so there is exactly one place that decides what "unconfigured" means
 * (UnconfiguredGameBundleRepository, see packages/db/src/storage).
 */
export function createContainer(db: D1Database, b2Config?: BackblazeB2Config): AppContainer {
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
  const gameCreatorRepo = new D1GameCreatorRepository(db);
  const sandboxGameRepo = new D1SandboxGameRepository(db);
  const gameAttemptRepo = new D1GameAttemptConsumptionRepository(db);
  const creatorScoreAcceptanceRepo = new D1CreatorScoreAcceptanceRepository(db);
  const gameBundleStorageRepo: GameBundleStorageRepository = b2Config
    ? new BackblazeB2GameBundleRepository(b2Config)
    : new UnconfiguredGameBundleRepository();
  // Stage C-2: composed from the same gameBundleStorageRepo above, never a second B2 client — see
  // B2CreatorGameDefinitionRepository's own doc comment. Real B2 access only when b2Config was
  // provided (gameBundlesConfigured); routes must check that flag themselves before calling
  // sandboxGameUseCases.updateMetadata, same as every other B2-dependent route already does.
  const creatorGameDefinitionRepo: CreatorGameDefinitionRepository =
    new B2CreatorGameDefinitionRepository(gameBundleStorageRepo);
  // Stage U-3: also composed from the same gameBundleStorageRepo above — see this container's own
  // doc comment on gameCanonicalRepo. Creator canonical (above) stays authoritative; this is a
  // shadow write target only.
  const gameCanonicalRepo: GameCanonicalRepository = new B2GameCanonicalRepository(
    gameBundleStorageRepo,
  );

  const scoreUseCases = new ScoreUseCases(scoreRepo, gameRegistry);
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
  const gameSettingsUseCases = new GameSettingsUseCases(gameSettingsRepo, gameRegistry);
  const userModerationUseCases = new UserModerationUseCases(
    userModerationRepo,
    sessionRepo,
    userRepo,
  );
  const gameCreatorUseCases = new GameCreatorUseCases(gameCreatorRepo, userRepo, gameCreatorRepo);
  const gameBundlePublisher = new GameBundlePublisher(
    sandboxGameRepo,
    gameBundleStorageRepo,
    new FflateBundleArchiveReader(),
  );
  const sandboxGameUseCases = new SandboxGameUseCases(
    sandboxGameRepo,
    gameBundleStorageRepo,
    gameBundlePublisher,
    gameRegistry,
    creatorGameDefinitionRepo,
    gameCanonicalRepo,
  );
  const gameAttemptUseCases = new GameAttemptUseCases(gameAttemptRepo);
  const creatorScoreAcceptanceUseCases = new CreatorScoreAcceptanceUseCases(
    sandboxGameRepo,
    creatorScoreAcceptanceRepo,
  );
  const creatorLeaderboardUseCases = new CreatorLeaderboardUseCases(sandboxGameRepo, scoreRepo);

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
    gameCreatorRepo,
    sandboxGameRepo,
    gameAttemptRepo,
    creatorScoreAcceptanceRepo,
    gameBundleStorageRepo,
    gameBundlesConfigured: Boolean(b2Config),
    creatorGameDefinitionRepo,
    gameCanonicalRepo,
    gameRegistry,

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
    gameCreatorUseCases,
    sandboxGameUseCases,
    gameAttemptUseCases,
    creatorScoreAcceptanceUseCases,
    creatorLeaderboardUseCases,
    gameBundlePublisher,
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
