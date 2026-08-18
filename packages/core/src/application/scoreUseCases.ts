import { formatScore } from "@owogg/game-sdk/contracts";
import type { Score, ScoreRepository } from "../ports/repositories.js";
import type { GameRegistry } from "../modules/game/ports/gameRegistry.js";
import {
  validateScoreAgainstPolicy,
  validateDifficultyAgainstDefinition,
} from "../domain/scoreValidation.js";

export interface FormattedScoreRecord extends Score {
  formattedScore: string;
  playerName: string;
}

/**
 * Resolves games through the injected {@link GameRegistry} rather than the build-time
 * `GAME_MANIFEST_MAP` this class used to import directly. Behaviourally unchanged for every
 * SYSTEM game today — the composition root wires a `StaticGameRegistry(GAME_DEFINITIONS)`, which
 * is held to agreement with `GAME_MANIFESTS` by `pnpm registry:check` (see
 * scripts/registry-builder.ts's assertDefinitionsMatchManifests) — but the lookup is no longer
 * hardcoded to that one source, which is the whole point: a registry that also resolves
 * creator-owned games can be substituted here without this class changing.
 */
export class ScoreUseCases {
  constructor(
    private scoreRepo: ScoreRepository,
    private registry: GameRegistry,
  ) {}

  async submitScore(data: {
    userId: number;
    nickname: string;
    avatarUrl?: string | null;
    gameId: string;
    score: number;
    difficulty?: string | undefined;
  }): Promise<{ valid: boolean; reason?: string; saved?: Score }> {
    const definition = await this.registry.findBySlug(data.gameId);

    const valResult = validateScoreAgainstPolicy(definition?.policy ?? null, data.score);
    if (!valResult.valid) {
      return { valid: false, ...(valResult.reason ? { reason: valResult.reason } : {}) };
    }

    const difficultyResult = validateDifficultyAgainstDefinition(
      definition?.difficulty,
      data.difficulty,
    );
    if (!difficultyResult.valid) {
      return {
        valid: false,
        ...(difficultyResult.reason ? { reason: difficultyResult.reason } : {}),
      };
    }

    const saved = await this.scoreRepo.saveScore({
      ...data,
      difficulty: difficultyResult.normalizedDifficultyId,
    });
    return { valid: true, saved };
  }

  async getLeaderboard(
    gameId: string,
    limit = 20,
    rawDifficulty?: string,
  ): Promise<FormattedScoreRecord[]> {
    const definition = await this.registry.findBySlug(gameId);
    const direction = definition?.policy.score?.direction ?? "desc";
    const difficulty = validateDifficultyAgainstDefinition(
      definition?.difficulty,
      rawDifficulty,
    ).normalizedDifficultyId;

    const rawScores = await this.scoreRepo.getLeaderboard(gameId, limit, direction, difficulty);

    // Every row came back filtered to this one gameId (scoreRepo.getLeaderboard's contract), so
    // one already-resolved definition formats them all rather than a lookup per row.
    return rawScores.map((item) => ({
      ...item,
      playerName: item.nickname,
      formattedScore: formatScore(item.score, definition?.policy.score ?? undefined),
    }));
  }

  async getUserBests(userId: number): Promise<Record<string, number>> {
    const aggregates = await this.scoreRepo.getUserPersonalBests(userId);
    const bests: Record<string, number> = {};

    for (const item of aggregates) {
      const definition = await this.registry.findBySlug(item.game_id);
      const direction = definition?.policy.score?.direction ?? "desc";
      bests[item.game_id] = direction === "asc" ? item.min_score : item.max_score;
    }

    return bests;
  }

  /** Same data as {@link getUserBests}, formatted per-game for public display (e.g. the
   * public profile page's "best records" list). */
  async getUserBestsFormatted(
    userId: number,
  ): Promise<Array<{ gameId: string; score: number; formattedScore: string }>> {
    const bests = await this.getUserBests(userId);
    const entries: Array<{ gameId: string; score: number; formattedScore: string }> = [];

    for (const [gameId, score] of Object.entries(bests)) {
      const definition = await this.registry.findBySlug(gameId);
      entries.push({
        gameId,
        score,
        formattedScore: formatScore(score, definition?.policy.score ?? undefined),
      });
    }

    return entries;
  }
}
