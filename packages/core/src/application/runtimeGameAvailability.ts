import type { GameSettingsRepository } from "../ports/repositories.js";
import type { GameIdentityRepository } from "../modules/game/ports/gameIdentityRepository.js";
import type { GameVersionRepository } from "../modules/game/ports/gameVersionRepository.js";

/**
 * D1-only emergency availability boundary for an exact generic asset version. It intentionally
 * has no canonical/B2 dependency, so a broken metadata object can never prevent an operator's
 * kill switch from taking effect.
 */
export class RuntimeGameAvailability {
  constructor(
    private readonly identities: GameIdentityRepository,
    private readonly versions: GameVersionRepository,
    private readonly settings: Pick<GameSettingsRepository, "getDisabledGameIds">,
  ) {}

  async isVersionServable(gameId: number, versionId: number): Promise<boolean> {
    if (
      !Number.isInteger(gameId) ||
      gameId <= 0 ||
      !Number.isInteger(versionId) ||
      versionId <= 0
    ) {
      return false;
    }

    const identity = await this.identities.findById(gameId);
    if (
      identity === null ||
      identity.deletedAt !== null ||
      identity.visibility !== "PUBLIC" ||
      identity.liveVersionId !== versionId
    ) {
      return false;
    }

    const version = await this.versions.findById(versionId);
    if (version === null || version.gameId !== identity.id || version.publishStatus !== "READY") {
      return false;
    }

    const disabledSlugs = await this.settings.getDisabledGameIds();
    return !disabledSlugs.includes(identity.slug);
  }
}
