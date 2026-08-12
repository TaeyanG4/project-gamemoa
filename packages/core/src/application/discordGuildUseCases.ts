import type {
  DiscordGuild,
  DiscordGuildRepository,
  DiscordGuildVisibility,
  DiscordCandidateGuild,
} from "../ports/repositories.js";
import {
  hasGuildManagementPermission,
  slugifyGuildName,
  validateVanitySlug,
} from "../domain/discordGuildPolicy.js";

export class DiscordGuildRegistrationUseCases {
  constructor(private readonly guildRepo: DiscordGuildRepository) {}

  async getCandidatesFromToken(
    userId: number,
    token: string,
  ): Promise<{ valid: boolean; candidates?: DiscordCandidateGuild[]; reason?: string }> {
    if (!token) {
      return { valid: false, reason: "Challenge token is required" };
    }
    const challenge = await this.guildRepo.findRegistrationChallengeByToken(token);
    if (!challenge) {
      return { valid: false, reason: "Invalid or expired challenge token" };
    }
    if (challenge.consumedAt) {
      return { valid: false, reason: "Challenge token has already been used" };
    }
    if (challenge.userId !== userId) {
      return { valid: false, reason: "Challenge token does not belong to current user" };
    }
    const now = new Date().toISOString();
    if (challenge.expiresAt <= now) {
      return { valid: false, reason: "Challenge token has expired" };
    }
    return { valid: true, candidates: challenge.manageableGuilds };
  }

  async registerGuild(input: {
    userId: number;
    token: string;
    guildId: string;
    slug?: string | undefined;
    description?: string | undefined;
    visibility: DiscordGuildVisibility;
  }): Promise<DiscordGuild> {
    const candidateCheck = await this.getCandidatesFromToken(input.userId, input.token);
    if (!candidateCheck.valid || !candidateCheck.candidates) {
      throw new Error(candidateCheck.reason || "Invalid registration token");
    }

    const candidate = candidateCheck.candidates.find((c) => c.guildId === input.guildId);
    if (!candidate) {
      throw new Error("You do not have management authority for this Discord guild");
    }

    const rawSlug = input.slug?.trim() ? input.slug.trim() : slugifyGuildName(candidate.name);
    const slugVal = validateVanitySlug(rawSlug);
    if (!slugVal.valid) {
      throw new Error(slugVal.reason || "Invalid vanity slug");
    }
    const slug = rawSlug;

    // Check if slug is taken by another guild
    const existingBySlug = await this.guildRepo.findBySlug(slug);
    if (existingBySlug && existingBySlug.guild_id !== input.guildId) {
      throw new Error(`Vanity slug '${slug}' is already in use`);
    }

    const existingByGuild = await this.guildRepo.findByGuildId(input.guildId);
    let registeredGuild: DiscordGuild;

    if (existingByGuild) {
      // Re-activate or update existing guild
      registeredGuild = await this.guildRepo.updateGuild(input.guildId, {
        slug,
        name: candidate.name,
        iconUrl: candidate.iconUrl,
        description:
          input.description !== undefined ? input.description : existingByGuild.description,
        visibility: input.visibility,
        registrationStatus: "ACTIVE",
      });

      const isManager = await this.guildRepo.isGuildManager(input.guildId, input.userId);
      if (!isManager) {
        await this.guildRepo.addGuildManager(input.guildId, input.userId, "MANAGER");
      }
    } else {
      registeredGuild = await this.guildRepo.registerGuild({
        guildId: input.guildId,
        slug,
        name: candidate.name,
        iconUrl: candidate.iconUrl,
        description: input.description ?? null,
        visibility: input.visibility,
        userId: input.userId,
      });
    }

    await this.guildRepo.consumeRegistrationChallengeByToken(input.token);
    return registeredGuild;
  }
}

export type PublicGuildPageResult =
  | { status: "OK"; guild: DiscordGuild; isManager: boolean }
  | { status: "FORBIDDEN"; guildName: string }
  | { status: "NOT_FOUND" };

export class DiscordGuildDirectoryUseCases {
  constructor(private readonly guildRepo: DiscordGuildRepository) {}

  async searchPublicGuilds(
    query?: string,
    limit?: number,
    offset?: number,
  ): Promise<{ guilds: DiscordGuild[]; total: number }> {
    const boundedLimit = Math.min(Math.max(limit ?? 20, 1), 50);
    const boundedOffset = Math.max(offset ?? 0, 0);
    return this.guildRepo.searchPublicGuilds(query, boundedLimit, boundedOffset);
  }

  async getGuildPageBySlug(slug: string, viewerUserId?: number): Promise<PublicGuildPageResult> {
    const guild = await this.guildRepo.findBySlug(slug);
    if (!guild || guild.registration_status === "DISABLED") {
      return { status: "NOT_FOUND" };
    }

    let isManager = false;
    if (viewerUserId) {
      isManager = await this.guildRepo.isGuildManager(guild.guild_id, viewerUserId);
    }

    if (guild.visibility === "PRIVATE" && !isManager) {
      return { status: "FORBIDDEN", guildName: guild.name };
    }

    return { status: "OK", guild, isManager };
  }

  async getUserManagedGuilds(userId: number): Promise<DiscordGuild[]> {
    return this.guildRepo.getUserManagedGuilds(userId);
  }
}

export class DiscordGuildManagementUseCases {
  constructor(private readonly guildRepo: DiscordGuildRepository) {}

  async updateGuildSettings(input: {
    userId: number;
    guildId: string;
    slug?: string | undefined;
    description?: string | null | undefined;
    visibility?: DiscordGuildVisibility | undefined;
  }): Promise<DiscordGuild> {
    const isManager = await this.guildRepo.isGuildManager(input.guildId, input.userId);
    if (!isManager) {
      throw new Error("Unauthorized to manage this server");
    }

    const guild = await this.guildRepo.findByGuildId(input.guildId);
    if (!guild || guild.registration_status === "DISABLED") {
      throw new Error("Guild not found or disabled");
    }

    let newSlug: string | undefined = undefined;
    if (input.slug !== undefined && input.slug.trim() !== guild.slug) {
      const trimmedSlug = input.slug.trim();
      const val = validateVanitySlug(trimmedSlug);
      if (!val.valid) {
        throw new Error(val.reason || "Invalid vanity slug");
      }
      const existingBySlug = await this.guildRepo.findBySlug(trimmedSlug);
      if (existingBySlug && existingBySlug.guild_id !== input.guildId) {
        throw new Error(`Vanity slug '${trimmedSlug}' is already in use`);
      }
      newSlug = trimmedSlug;
    }

    const updates: {
      slug?: string;
      description?: string | null;
      visibility?: DiscordGuildVisibility;
    } = {};
    if (newSlug !== undefined) updates.slug = newSlug;
    if (input.description !== undefined) updates.description = input.description;
    if (input.visibility !== undefined) updates.visibility = input.visibility;

    return this.guildRepo.updateGuild(input.guildId, updates);
  }

  async unregisterGuild(input: { userId: number; guildId: string }): Promise<DiscordGuild> {
    const isManager = await this.guildRepo.isGuildManager(input.guildId, input.userId);
    if (!isManager) {
      throw new Error("Unauthorized to manage this server");
    }
    const guild = await this.guildRepo.findByGuildId(input.guildId);
    if (!guild) {
      throw new Error("Guild not found");
    }
    return this.guildRepo.updateGuild(input.guildId, {
      registrationStatus: "DISABLED",
    });
  }
}
