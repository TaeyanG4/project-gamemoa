import type {
  GameDeveloperRepository,
  GameDeveloperRecord,
  GameDeveloperAuditEntry,
} from "../ports/gameDevelopers.js";
import type { UserRepository } from "../ports/repositories.js";

export type GameDeveloperUseCaseError = "USER_NOT_FOUND" | "ALREADY_ACTIVE" | "NOT_A_DEVELOPER";

export class GameDeveloperUseCaseFailure extends Error {
  constructor(public readonly code: GameDeveloperUseCaseError) {
    super(code);
  }
}

/**
 * Orchestrates game-developer upload-permission grants on top of GameDeveloperRepository.
 * Deliberately thin — the only invariants worth enforcing here (rather than leaving to the DB
 * layer) are "the target user must actually exist" and "don't silently no-op a re-grant of an
 * already-active developer without the caller knowing".
 */
export class GameDeveloperUseCases {
  constructor(
    private repo: GameDeveloperRepository,
    private userRepo: UserRepository,
  ) {}

  async getByUserId(userId: number): Promise<GameDeveloperRecord | null> {
    return this.repo.findByUserId(userId);
  }

  async isActiveDeveloper(userId: number): Promise<boolean> {
    const record = await this.repo.findByUserId(userId);
    return record?.status === "ACTIVE";
  }

  async list(): Promise<GameDeveloperRecord[]> {
    return this.repo.list();
  }

  async grant(targetUserId: number, adminId: number): Promise<GameDeveloperRecord> {
    const user = await this.userRepo.findById(targetUserId);
    if (!user) throw new GameDeveloperUseCaseFailure("USER_NOT_FOUND");

    const existing = await this.repo.findByUserId(targetUserId);
    if (existing?.status === "ACTIVE") {
      throw new GameDeveloperUseCaseFailure("ALREADY_ACTIVE");
    }

    const nowIso = new Date().toISOString();
    const record = existing
      ? await this.repo.setStatus(targetUserId, "ACTIVE", nowIso)
      : await this.repo.grant(targetUserId, adminId, nowIso);
    await this.repo.appendAudit({
      targetUserId,
      actorAdminId: adminId,
      action: existing ? "REINSTATED" : "GRANTED",
      nowIso,
    });
    return record;
  }

  async revoke(targetUserId: number, adminId: number): Promise<GameDeveloperRecord> {
    const existing = await this.repo.findByUserId(targetUserId);
    if (!existing || existing.status !== "ACTIVE") {
      throw new GameDeveloperUseCaseFailure("NOT_A_DEVELOPER");
    }

    const nowIso = new Date().toISOString();
    const record = await this.repo.setStatus(targetUserId, "REVOKED", nowIso);
    await this.repo.appendAudit({
      targetUserId,
      actorAdminId: adminId,
      action: "REVOKED",
      nowIso,
    });
    return record;
  }

  async getAudit(targetUserId: number, limit = 50): Promise<GameDeveloperAuditEntry[]> {
    return this.repo.listAudit(targetUserId, limit);
  }
}
