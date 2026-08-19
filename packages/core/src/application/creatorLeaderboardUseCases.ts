import { formatScore } from "@owogg/game-sdk/contracts";
import type { ScoreRepository } from "../ports/repositories.js";
import type { SandboxGameRepository } from "../ports/sandboxGames.js";
import { sandboxGameToScorePolicy } from "../domain/creatorScorePolicy.js";
import type { FormattedScoreRecord } from "./scoreUseCases.js";

export interface CreatorLeaderboard {
  gameTitle: string;
  rows: FormattedScoreRecord[];
}

/**
 * The Creator-game counterpart to ScoreUseCases.getLeaderboard — deliberately a separate, minimal
 * class rather than an extension of ScoreUseCases itself, matching this codebase's established
 * precedent (CreatorScoreAcceptanceUseCases alongside ScoreUseCases, gameSession.ts alongside
 * scores.ts): ScoreUseCases is coupled to the SYSTEM-only GameRegistry port by design, and every
 * prior Creator-facing addition has stayed a parallel path built from the same *pure* pieces
 * rather than reaching into that class. Here those pieces are `ScoreRepository.getLeaderboard`
 * (the exact same D1-backed PB-dedup SQL SYSTEM games already use — see D1ScoreRepository, no new
 * query) and `sandboxGameToScorePolicy` (the same TEMPORARY D1-metadata-to-GamePolicy adapter
 * CreatorScoreAcceptanceUseCases already uses — see that function's own doc comment on why it's
 * temporary and what replaces it once the Creator registry moves to its final structure).
 *
 * Availability gate mirrors CreatorScoreAcceptanceUseCases.accept's own: PUBLIC, has a live
 * version, AND a fully-configured score policy (every score_* column set — see
 * sandboxGameToScorePolicy's own doc comment on why a freshly-registered game with nothing
 * configured yet is null, not an unbounded policy). Any of those failing returns `null` — the
 * caller (GET /api/scores/:gameId) collapses that into the exact same INVALID_GAME_ID response an
 * unknown SYSTEM slug already gets, the same "can't distinguish unknown from
 * private/unconfigured" posture used everywhere else a Creator game is read publicly in this
 * codebase.
 */
export class CreatorLeaderboardUseCases {
  constructor(
    private sandboxGameRepo: SandboxGameRepository,
    private scoreRepo: ScoreRepository,
  ) {}

  async getLeaderboard(slug: string, limit = 20): Promise<CreatorLeaderboard | null> {
    const game = await this.sandboxGameRepo.findBySlug(slug);
    if (!game || game.visibility !== "PUBLIC" || game.liveVersionId === null) {
      return null;
    }

    const policy = sandboxGameToScorePolicy(game);
    if (!policy) {
      return null;
    }

    // Creator games have no difficulty tiers today (see creatorScorePolicy.ts) — every row is
    // "normal", the same single-tier default every difficulty-less SYSTEM game already uses.
    const direction = policy.score?.direction ?? "desc";
    const rawScores = await this.scoreRepo.getLeaderboard(slug, limit, direction, "normal");

    const rows = rawScores.map((item) => ({
      ...item,
      playerName: item.nickname,
      formattedScore: formatScore(item.score, policy.score ?? undefined),
    }));

    return { gameTitle: game.title, rows };
  }
}
