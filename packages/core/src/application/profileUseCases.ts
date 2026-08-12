import type { User, UserRepository } from "../ports/repositories.js";
import {
  NICKNAME_COOLDOWN_DAYS,
  COUNTRY_COOLDOWN_DAYS,
  validateNickname,
  validateCountry,
  checkCooldown,
} from "../domain/profilePolicy.js";

export type UpdateNicknameResult =
  | { ok: true; user: User }
  | { ok: false; code: "INVALID_NICKNAME"; reason: string }
  | { ok: false; code: "NICKNAME_COOLDOWN_ACTIVE"; nextAllowedAt: string }
  | { ok: false; code: "USER_NOT_FOUND" };

export type UpdateCountryResult =
  | { ok: true; user: User }
  | { ok: false; code: "INVALID_COUNTRY" }
  | { ok: false; code: "COUNTRY_COOLDOWN_ACTIVE"; nextAllowedAt: string }
  | { ok: false; code: "USER_NOT_FOUND" };

export class ProfileUseCases {
  constructor(private userRepo: UserRepository) {}

  async updateNickname(userId: number, rawNickname: string): Promise<UpdateNicknameResult> {
    const user = await this.userRepo.findById(userId);
    if (!user) return { ok: false, code: "USER_NOT_FOUND" };

    const validation = validateNickname(rawNickname);
    if (!validation.valid) {
      return { ok: false, code: "INVALID_NICKNAME", reason: validation.reason };
    }

    const cooldown = checkCooldown(user.nickname_updated_at ?? null, NICKNAME_COOLDOWN_DAYS);
    if (!cooldown.allowed) {
      return { ok: false, code: "NICKNAME_COOLDOWN_ACTIVE", nextAllowedAt: cooldown.nextAllowedAt };
    }

    const updated = await this.userRepo.updateNickname(
      userId,
      validation.nickname,
      new Date().toISOString(),
    );
    return { ok: true, user: updated };
  }

  async updateCountry(userId: number, rawCountry: string | null): Promise<UpdateCountryResult> {
    const user = await this.userRepo.findById(userId);
    if (!user) return { ok: false, code: "USER_NOT_FOUND" };

    const validation = validateCountry(rawCountry);
    if (!validation.valid) {
      return { ok: false, code: "INVALID_COUNTRY" };
    }

    const cooldown = checkCooldown(user.country_updated_at ?? null, COUNTRY_COOLDOWN_DAYS);
    if (!cooldown.allowed) {
      return { ok: false, code: "COUNTRY_COOLDOWN_ACTIVE", nextAllowedAt: cooldown.nextAllowedAt };
    }

    const updated = await this.userRepo.updateCountry(
      userId,
      validation.country,
      new Date().toISOString(),
    );
    return { ok: true, user: updated };
  }
}
