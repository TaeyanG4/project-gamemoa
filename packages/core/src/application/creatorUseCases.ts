import { GAME_MANIFEST_MAP } from "../registry/gameRegistry.generated.js";
import { levelForTotalXp } from "../domain/progression.js";
import type {
  CreatorRepository,
  CreatorRankEntry,
  CreatorPlatformType,
  CreatorProfile,
  CreatorPlatformAccount,
} from "../ports/repositories.js";

export class CreatorUseCases {
  constructor(private creatorRepo: CreatorRepository) {}

  async getCreatorRankings(options: {
    mode: "score" | "xp";
    gameId?: string;
    platform?: CreatorPlatformType;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: CreatorRankEntry[]; total: number }> {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const offset = Math.max(options.offset ?? 0, 0);

    const selectedGameId = options.gameId && options.gameId !== "all" ? options.gameId : undefined;
    const manifest = selectedGameId ? GAME_MANIFEST_MAP[selectedGameId] : undefined;
    const direction = manifest?.scoreConfig?.direction ?? "desc";

    const queryOpts: {
      mode: "score" | "xp";
      gameId?: string;
      direction?: "asc" | "desc";
      platform?: CreatorPlatformType;
      limit?: number;
      offset?: number;
    } = {
      mode: options.mode,
      direction,
      limit,
      offset,
    };
    if (selectedGameId !== undefined) queryOpts.gameId = selectedGameId;
    if (options.platform !== undefined) queryOpts.platform = options.platform;

    const res = await this.creatorRepo.getCreatorRankings(queryOpts);

    const entries: CreatorRankEntry[] = res.entries.map((entry) => {
      if (options.mode === "score" && entry.gameId && entry.score !== undefined) {
        const gManifest = GAME_MANIFEST_MAP[entry.gameId];
        const formattedScore = gManifest?.scoreConfig
          ? `${entry.score.toLocaleString()} ${gManifest.scoreConfig.unit}`
          : String(entry.score);
        return {
          ...entry,
          formattedScore,
          gameTitle: gManifest ? gManifest.title : entry.gameId,
        };
      } else if (options.mode === "xp" && entry.totalXp !== undefined) {
        const level = levelForTotalXp(entry.totalXp);
        return {
          ...entry,
          level,
        };
      }
      return entry;
    });

    return { entries, total: res.total };
  }

  async getCreatorProfileByUserId(
    userId: number,
  ): Promise<(CreatorProfile & { platformAccounts: CreatorPlatformAccount[] }) | null> {
    return this.creatorRepo.findProfileByUserId(userId);
  }
}
