import type { DiscordLinkChallenge, DiscordLinkRepository } from "../ports/repositories.js";

export class DiscordLinkUseCases {
  static readonly CHALLENGE_TTL_SECONDS = 600; // 10 minutes

  constructor(private repo: DiscordLinkRepository) {}

  /** Called from the verified Discord interaction handler for `/gamemoa link`. */
  async createLinkChallenge(
    discordUserId: string,
    discordUsername: string,
  ): Promise<{ token: string; expiresAt: string }> {
    return this.repo.createChallenge({
      discordUserId,
      discordUsername,
      ttlSeconds: DiscordLinkUseCases.CHALLENGE_TTL_SECONDS,
    });
  }

  /**
   * Returns the challenge only if it is still valid (exists, unexpired, unconsumed) — used
   * both for the website's pre-login preview ("Discord 계정 @user을 연동하시겠습니까?") and as
   * the authoritative identity proof at confirmation time. Never trust a caller-supplied
   * discordUserId directly; only this validated token round-trip proves it.
   */
  async findValidChallenge(token: string): Promise<DiscordLinkChallenge | null> {
    const challenge = await this.repo.findChallengeByToken(token);
    if (!challenge) return null;
    if (challenge.consumedAt) return null;
    if (new Date(challenge.expiresAt) <= new Date()) return null;
    return challenge;
  }

  async consumeChallenge(token: string): Promise<void> {
    await this.repo.consumeChallengeByToken(token);
  }
}
