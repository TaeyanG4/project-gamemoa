import type { SandboxGameRepository } from "../ports/sandboxGames.js";
import type {
  GamePublicationFacts,
  GameVersionPublicationRepository,
} from "../modules/game/ports/gameVersionPublicationRepository.js";

/** USER compatibility adapter. Review status stays entirely in SandboxGameRepository. */
export class SandboxGameVersionPublicationRepository implements GameVersionPublicationRepository {
  constructor(private readonly sandboxGames: SandboxGameRepository) {}

  async markPublishing(versionId: number): Promise<void> {
    await this.sandboxGames.setVersionPublishState(versionId, {
      publishStatus: "PUBLISHING",
      publishError: null,
      publishedAt: null,
      manifestKey: null,
      publishedSizeBytes: null,
      fileCount: null,
    });
  }

  async markReady(versionId: number, facts: GamePublicationFacts): Promise<void> {
    await this.sandboxGames.setVersionPublishState(versionId, {
      publishStatus: "READY",
      publishError: null,
      publishedAt: facts.publishedAt,
      manifestKey: facts.manifestKey,
      publishedSizeBytes: facts.publishedSizeBytes,
      fileCount: facts.fileCount,
    });
  }

  async markFailed(versionId: number, safeReason: string): Promise<void> {
    await this.sandboxGames.setVersionPublishState(versionId, {
      publishStatus: "FAILED",
      publishError: safeReason,
      publishedAt: null,
      manifestKey: null,
      publishedSizeBytes: null,
      fileCount: null,
    });
  }
}
