import type { OAuthAccount, UserRepository } from "../ports/repositories.js";

export type LinkProviderResult =
  | { ok: true; provider: string; alreadyLinked: boolean }
  | { ok: false; code: "ACCOUNT_ALREADY_LINKED"; conflictUserId: number }
  | { ok: false; code: "PROVIDER_ALREADY_LINKED" };

export type UnlinkProviderResult =
  { ok: true; provider: string } | { ok: false; code: "LAST_AUTH_PROVIDER" };

export interface ConnectedProvider {
  provider: string;
  providerUserId: string;
  providerEmail: string | null;
}

export class IdentityUseCases {
  constructor(private userRepo: UserRepository) {}

  async getConnectedProviders(userId: number): Promise<ConnectedProvider[]> {
    const accounts = await this.userRepo.getOAuthAccounts(userId);
    return accounts.map((a) => ({
      provider: a.provider,
      providerUserId: a.provider_user_id,
      providerEmail: a.provider_email,
    }));
  }

  async linkProvider(
    userId: number,
    provider: string,
    providerUserId: string,
    providerEmail: string | null,
  ): Promise<LinkProviderResult> {
    // 1. Does this provider identity already exist anywhere?
    const existing = await this.userRepo.findOAuthAccount(provider, providerUserId);
    if (existing) {
      if (existing.user_id === userId) {
        return { ok: true, provider, alreadyLinked: true };
      }
      // Belongs to a different GAMEMOA account — explicit conflict.
      return { ok: false, code: "ACCOUNT_ALREADY_LINKED", conflictUserId: existing.user_id };
    }

    // 2. Does the current account already have a different identity for this provider?
    const currentAccounts = await this.userRepo.getOAuthAccounts(userId);
    const hasProvider = currentAccounts.some((a) => a.provider === provider);
    if (hasProvider) {
      return { ok: false, code: "PROVIDER_ALREADY_LINKED" };
    }

    // 3. Attach the new provider identity to the current account.
    await this.userRepo.linkOAuthAccount(userId, provider, providerUserId, providerEmail);
    return { ok: true, provider, alreadyLinked: false };
  }

  async unlinkProvider(userId: number, provider: string): Promise<UnlinkProviderResult> {
    const accounts = await this.userRepo.getOAuthAccounts(userId);
    const remaining = accounts.filter((a: OAuthAccount) => a.provider !== provider);

    // Must keep at least one login method.
    if (remaining.length === 0) {
      return { ok: false, code: "LAST_AUTH_PROVIDER" };
    }

    await this.userRepo.unlinkOAuthAccount(userId, provider);
    return { ok: true, provider };
  }
}
