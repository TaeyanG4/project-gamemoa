import { GAME_MANIFEST_MAP } from "../registry/gameRegistry.generated.js";
import { formatScore } from "@gamemoa/game-sdk";
import type { Score, ScoreRepository } from "../ports/repositories.js";
import { validateScorePayload } from "../domain/scoreValidation.js";

export interface FormattedScoreRecord extends Score {
  formattedScore: string;
  playerName: string;
}

export class ScoreUseCases {
  constructor(private scoreRepo: ScoreRepository) {}

  async submitScore(data: {
    userId?: number | null;
    nickname: string;
    avatarUrl?: string | null;
    gameId: string;
    score: number;
  }): Promise<{ valid: boolean; reason?: string; saved?: Score }> {
    const valResult = validateScorePayload(data.gameId, data.score);
    if (!valResult.valid) {
      return { valid: false, ...(valResult.reason ? { reason: valResult.reason } : {}) };
    }

    const saved = await this.scoreRepo.saveScore(data);
    return { valid: true, saved };
  }

  async getLeaderboard(gameId: string, limit = 20): Promise<FormattedScoreRecord[]> {
    const manifest = GAME_MANIFEST_MAP[gameId];
    const direction = manifest?.scoreConfig?.direction ?? "desc";

    const rawScores = await this.scoreRepo.getLeaderboard(gameId, limit, direction);

    return rawScores.map((item) => {
      const gManifest = GAME_MANIFEST_MAP[item.game_id];
      const formatted = formatScore(item.score, gManifest?.scoreConfig);

      return {
        ...item,
        playerName: item.nickname,
        formattedScore: formatted,
      };
    });
  }

  async getUserBests(userId: number): Promise<Record<string, number>> {
    const aggregates = await this.scoreRepo.getUserPersonalBests(userId);
    const bests: Record<string, number> = {};

    for (const item of aggregates) {
      const gId = item.game_id;
      const direction = GAME_MANIFEST_MAP[gId]?.scoreConfig?.direction ?? "desc";
      bests[gId] = direction === "asc" ? item.min_score : item.max_score;
    }

    return bests;
  }
}
