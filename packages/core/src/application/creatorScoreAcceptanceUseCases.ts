import { verifyGameSession, gameSessionMatches } from "../domain/gameSession.js";
import { sandboxGameToScorePolicy } from "../domain/creatorScorePolicy.js";
import { validateScoreAgainstPolicy } from "../domain/scoreValidation.js";
import type { SandboxGameRepository } from "../ports/sandboxGames.js";
import type { CreatorScoreAcceptanceRepository } from "../ports/creatorScoreAcceptance.js";

export type CreatorScoreAcceptError =
  /** The slug doesn't currently resolve to a PUBLIC Creator game with a live version — same gate
   * SandboxGameUseCases.resolveLiveVersion already applies everywhere else a player-facing read
   * touches a Creator game. Covers "unknown slug", "private", and "no live version yet"
   * identically — same can't-distinguish-unknown-from-private posture as the rest of this
   * surface. */
  | "GAME_NOT_AVAILABLE"
  /** The token itself didn't verify — malformed, wrong signature, or past its exp. */
  | "INVALID_TOKEN"
  /** The token verified, but doesn't match this call's actual context: a different user, or —
   * critically — a different game/version than what is CURRENTLY live. A token issued against a
   * live version that has since changed (an admin rolled back or approved a new build) fails
   * here, not because the token itself went bad, but because what it was valid FOR moved on. */
  | "CONTEXT_MISMATCH"
  /** This Creator game has no complete score policy set by an admin yet — see
   * sandboxGameToScorePolicy's doc comment on why this is distinct from "deliberately unscored". */
  | "SCORE_POLICY_NOT_CONFIGURED"
  /** The score fails validation against the configured policy (out of bounds, not an integer, negative). */
  | "INVALID_SCORE"
  /** The attemptId was already spent — a replay, or a genuine concurrent duplicate that lost the
   * atomic race inside CreatorScoreAcceptanceRepository.acceptScore. */
  | "ALREADY_CONSUMED";

export type CreatorScoreAcceptResult =
  { ok: true } | { ok: false; error: CreatorScoreAcceptError; reason?: string };

/**
 * Server-side acceptance for a Creator game's score: the first place a Game Session token
 * actually gets spent for something. Every check below runs BEFORE
 * CreatorScoreAcceptanceRepository.acceptScore is ever called, specifically so that method's
 * atomic attempt-consume + score-save is the LAST thing that can fail — by the time it runs, this
 * class has already confirmed the game is available, the token is genuine and for the right
 * context, and the score is within policy. That ordering is what makes "the attempt gets consumed
 * but the score never gets saved" structurally impossible: nothing left to fail past that point
 * except the atomic write itself, which either fully succeeds or fully no-ops.
 *
 * Deliberately does nothing past accepting the row: no leaderboard read, no XP/achievement/guild
 * XP award — those stay wired to the existing SYSTEM-game submission path
 * (apps/api/src/routes/scores.ts) until a later PR connects them here too.
 */
export class CreatorScoreAcceptanceUseCases {
  constructor(
    private sandboxGameRepo: SandboxGameRepository,
    private acceptanceRepo: CreatorScoreAcceptanceRepository,
  ) {}

  async accept(input: {
    slug: string;
    /** Always the server session's own user id — never trust a client-supplied one. See this
     * method's caller (the route layer) for where that's actually enforced. */
    userId: number;
    nickname: string;
    avatarUrl: string | null;
    token: string;
    secret: string;
    score: number;
  }): Promise<CreatorScoreAcceptResult> {
    // Mirrors SandboxGameUseCases.resolveLiveVersion exactly (PUBLIC + has a live version),
    // duplicated rather than depending on that use case class directly — this codebase's use
    // cases depend only on repositories, never on each other (see SandboxGameUseCases itself for
    // the precedent this follows). Resolved fresh on every call, not trusted from whenever the
    // Game Session token was issued: this IS the "exact live version" check the task called for.
    const game = await this.sandboxGameRepo.findBySlug(input.slug);
    if (!game || game.visibility !== "PUBLIC" || game.liveVersionId === null) {
      return { ok: false, error: "GAME_NOT_AVAILABLE" };
    }
    const version = await this.sandboxGameRepo.findVersionById(game.liveVersionId);
    if (!version || version.gameId !== game.id) {
      return { ok: false, error: "GAME_NOT_AVAILABLE" };
    }

    const verified = await verifyGameSession(input.token, input.secret);
    if (!verified.ok) return { ok: false, error: "INVALID_TOKEN" };

    if (
      !gameSessionMatches(verified.payload, {
        userId: input.userId,
        gameId: game.id,
        versionId: version.id,
      })
    ) {
      return { ok: false, error: "CONTEXT_MISMATCH" };
    }

    const policy = sandboxGameToScorePolicy(game);
    if (!policy) return { ok: false, error: "SCORE_POLICY_NOT_CONFIGURED" };

    const scoreResult = validateScoreAgainstPolicy(policy, input.score);
    if (!scoreResult.valid) {
      return {
        ok: false,
        error: "INVALID_SCORE",
        ...(scoreResult.reason ? { reason: scoreResult.reason } : {}),
      };
    }

    const { accepted } = await this.acceptanceRepo.acceptScore({
      attemptId: verified.payload.attemptId,
      userId: input.userId,
      gameId: game.id,
      versionId: version.id,
      slug: input.slug,
      nickname: input.nickname,
      avatarUrl: input.avatarUrl,
      score: input.score,
      difficulty: "normal", // Creator games have no difficulty tiers today
      nowIso: new Date().toISOString(),
    });
    if (!accepted) return { ok: false, error: "ALREADY_CONSUMED" };

    return { ok: true };
  }
}
