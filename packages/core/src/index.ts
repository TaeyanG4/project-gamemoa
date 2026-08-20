export * from "./errors/index.js";
export * from "./domain/scoreValidation.js";
export * from "./domain/progression.js";
export * from "./domain/achievements.js";
export * from "./domain/profilePolicy.js";
export * from "./domain/discordGuildPolicy.js";
export * from "./domain/featuredPolicy.js";
export * from "./domain/adminAuth.js";
export * from "./domain/staffRoles.js";
export * from "./domain/adminAccounts.js";
export * from "./domain/i18nPolicy.js";
export * from "./domain/streak.js";
export * from "./domain/adminUserQuery.js";
export * from "./domain/gameCreator.js";
export * from "./domain/sandboxGames.js";
export * from "./domain/sandboxGameBundle.js";
export * from "./domain/creatorGameCanonicalDocument.js";
export * from "./domain/creatorGameCanonicalMapper.js";
export * from "./domain/creatorGameCanonicalPatch.js";
export * from "./domain/systemGameBundle.js";
export * from "./domain/contentHash.js";
export * from "./domain/gameSession.js";
export * from "./domain/creatorScorePolicy.js";
export * from "./ports/repositories.js";
export * from "./ports/creatorProvider.js";
export * from "./ports/adminAuth.js";
export * from "./ports/adminAccounts.js";
export * from "./ports/gameCreator.js";
export * from "./ports/sandboxGames.js";
export * from "./ports/creatorGameDefinition.js";
export * from "./ports/gameAttempt.js";
export * from "./ports/creatorScoreAcceptance.js";

// Unified Game Platform foundation (modules/game). ScoreUseCases/GameSettingsUseCases already
// resolve SYSTEM games through GameRegistry (see application/scoreUseCases.js below); the
// sandbox* exports above remain the live path for everything creator-facing — registration,
// review, publishing, and gameServing's security boundary are untouched by this module.
export * from "./modules/game/domain/gameOwner.js";
export * from "./modules/game/domain/gameDefinition.js";
export * from "./modules/game/domain/creatorGameStatus.js";
export * from "./modules/game/domain/publicGame.js";
// Unified Game Platform, Stage U-1 (foundation only — see each file's own top doc comment for the
// exhaustive list of what stays unwired in production by this Stage).
export * from "./modules/game/domain/gamePublisher.js";
export * from "./modules/game/domain/gameCanonicalDocument.js";
export * from "./modules/game/domain/gameCanonicalMigration.js";
export * from "./modules/game/ports/gameRegistry.js";
export * from "./modules/game/ports/gameCanonicalRepository.js";
export * from "./modules/game/registry/staticGameRegistry.js";
export * from "./modules/game/registry/creatorGameRegistry.js";
// Unified Game Platform, Stage A-1 — game identity domain foundation
export * from "./modules/game/domain/gameIdentity.js";
export * from "./modules/game/ports/gameIdentityRepository.js";
export * from "./modules/game/domain/gameVersion.js";
export * from "./modules/game/ports/gameVersionRepository.js";
export * from "./modules/game/domain/runtimeGame.js";
export * from "./modules/game/ports/runtimeGameRegistry.js";
export * from "./modules/game/registry/composedRuntimeGameRegistry.js";

export * from "./repositories/interfaces.js";
export * from "./application/scoreUseCases.js";
export * from "./application/personalizationUseCases.js";
export * from "./application/identityUseCases.js";
export * from "./application/accountMergeUseCases.js";
export * from "./application/progressionUseCases.js";
export * from "./application/achievementUseCases.js";
export * from "./application/profileUseCases.js";
export * from "./application/discordLinkUseCases.js";
export * from "./domain/discordGuildPolicy.js";
export * from "./application/discordGuildUseCases.js";
export * from "./application/discordGuildXpUseCases.js";
export * from "./application/creatorUseCases.js";
export * from "./application/adminAuthUseCases.js";
export * from "./application/adminAccountUseCases.js";
export * from "./application/gameSettingsUseCases.js";
export * from "./application/userModerationUseCases.js";
export * from "./application/gameCreatorUseCases.js";
export * from "./application/sandboxGameUseCases.js";
export * from "./application/gameBundlePublisher.js";
export * from "./application/jsonDeepEqual.js";
export * from "./application/creatorCanonicalBackfill.js";
// Unified Game Platform, Stage U-2 — non-destructive Creator canonical -> generic canonical
// migration/parity orchestration. See this file's own top doc comment for the exhaustive "what
// stays unwired in production by this Stage" list.
export * from "./application/genericCanonicalMigration.js";
export * from "./application/systemGameBundlePublisher.js";
export * from "./application/officialGameShadowBootstrap.js";
export * from "./application/runtimeGameAvailability.js";
export * from "./application/gameAttemptUseCases.js";
export * from "./application/creatorScoreAcceptanceUseCases.js";
export * from "./application/creatorLeaderboardUseCases.js";
export * from "./registry/gameRegistry.generated.js";
// Compiled from game-registry/. The composition root wires StaticGameRegistry(GAME_DEFINITIONS)
// as the GameRegistry ScoreUseCases/GameSettingsUseCases resolve games through (see
// apps/api/src/container.ts) — GAME_MANIFESTS above stays the source for everything that hasn't
// been moved onto the GameRegistry port yet (achievements, personalization, creator/Discord
// tooling — see their own GAME_MANIFEST_MAP imports).
export * from "./registry/gameDefinitions.generated.js";
