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
export * from "./domain/contentHash.js";
export * from "./ports/repositories.js";
export * from "./ports/creatorProvider.js";
export * from "./ports/adminAuth.js";
export * from "./ports/adminAccounts.js";
export * from "./ports/gameCreator.js";
export * from "./ports/sandboxGames.js";

// Unified Game Platform foundation (modules/game) — types and one port, no implementation and no
// runtime wiring yet. The existing sandbox* exports above stay the live path until the phased
// migration moves each consumer over; see packages/core/src/modules/game/ports/gameRegistry.ts.
export * from "./modules/game/domain/gameOwner.js";
export * from "./modules/game/domain/gameDefinition.js";
export * from "./modules/game/ports/gameRegistry.js";

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
export * from "./registry/gameRegistry.generated.js";
