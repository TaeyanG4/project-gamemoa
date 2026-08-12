import type { DiscordGuildRepository, UserRepository } from "../ports/repositories.js";
import { GAME_MANIFEST_MAP } from "../registry/gameRegistry.generated.js";

export class DiscordGuildXpUseCases {
  constructor(
    private guildRepo: DiscordGuildRepository,
    private userRepo: UserRepository,
  ) {}

  async createPlayContextFromInteraction(input: {
    guildId: string;
    discordUserId: string;
    gameId?: string | null;
  }): Promise<{ token: string; expiresAt: string; guildName: string; slug: string }> {
    const guild = await this.guildRepo.findByGuildId(input.guildId);
    if (!guild || guild.registration_status !== "ACTIVE") {
      throw new Error(
        "이 Discord 서버는 아직 GAMEMOA에 등록되지 않았거나 비활성화되었습니다. 웹사이트(/discord/servers)에서 먼저 서버를 등록해 주세요.",
      );
    }

    const oauthAccount = await this.userRepo.findOAuthAccount("discord", input.discordUserId);
    if (!oauthAccount) {
      throw new Error(
        "GAMEMOA 계정이 Discord와 연결되어 있지 않습니다. /gamemoa link 명령어로 계정을 연결해 주세요.",
      );
    }

    if (input.gameId) {
      const trimmed = input.gameId.trim();
      if (!GAME_MANIFEST_MAP[trimmed]) {
        throw new Error(`존재하지 않는 게임 ID입니다: ${trimmed}`);
      }
    }

    const playCtx = await this.guildRepo.createPlayContext({
      guildId: input.guildId,
      discordUserId: input.discordUserId,
      userId: oauthAccount.user_id,
      gameId: input.gameId ? input.gameId.trim() : null,
    });

    return {
      token: playCtx.token,
      expiresAt: playCtx.expiresAt,
      guildName: guild.name,
      slug: guild.slug,
    };
  }

  async attributeCompletionToGuild(input: {
    userId: number;
    gameId: string;
    sourceXpEventId: number;
    xpAmount: number;
    playToken: string;
  }): Promise<{
    attributed: boolean;
    reason?: string | undefined;
    guildId?: string | undefined;
    amount?: number | undefined;
  }> {
    if (!input.playToken || !input.playToken.trim()) {
      return { attributed: false, reason: "NO_PLAY_TOKEN" };
    }

    const trimmedToken = input.playToken.trim();
    const playCtx = await this.guildRepo.findPlayContextByToken(trimmedToken);
    if (!playCtx || playCtx.consumedAt !== null) {
      return { attributed: false, reason: "INVALID_OR_CONSUMED_TOKEN" };
    }

    const nowMs = Date.now();
    const expiresMs = new Date(playCtx.expiresAt).getTime();
    if (isNaN(expiresMs) || expiresMs <= nowMs) {
      return { attributed: false, reason: "EXPIRED_TOKEN" };
    }

    if (playCtx.userId !== input.userId) {
      return { attributed: false, reason: "USER_MISMATCH" };
    }

    if (playCtx.gameId && playCtx.gameId !== input.gameId) {
      return { attributed: false, reason: "GAME_MISMATCH" };
    }

    const guild = await this.guildRepo.findByGuildId(playCtx.guildId);
    if (!guild || guild.registration_status !== "ACTIVE") {
      return { attributed: false, reason: "GUILD_NOT_ACTIVE" };
    }

    // Mark play token as consumed
    await this.guildRepo.consumePlayContextByToken(trimmedToken);

    // Attribute XP to guild (1:1 with awarded global XP, 0 if capped)
    const xpEvent = await this.guildRepo.attributeGuildXp({
      guildId: playCtx.guildId,
      userId: input.userId,
      sourceXpEventId: input.sourceXpEventId,
      amount: input.xpAmount,
    });

    return {
      attributed: true,
      guildId: playCtx.guildId,
      amount: input.xpAmount,
    };
  }

  async getGuildUserXp(guildId: string, userId: number): Promise<number> {
    return this.guildRepo.getGuildUserXp(guildId, userId);
  }

  async getGuildTotalXp(guildId: string): Promise<number> {
    return this.guildRepo.getGuildTotalXp(guildId);
  }
}
