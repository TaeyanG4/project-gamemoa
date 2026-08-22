import type { PreparedBundle } from "../domain/sandboxGameBundle.js";
import { sourceArchiveObjectKey } from "../domain/sandboxGameBundle.js";
import { systemGameDefinitionToGameCanonicalDocument } from "../modules/game/domain/gameCanonicalMigration.js";
import type { SystemGameDefinition } from "../modules/game/domain/gameDefinition.js";
import type { GameCanonicalDocument } from "../modules/game/domain/gameCanonicalDocument.js";
import type { GameIdentity } from "../modules/game/domain/gameIdentity.js";
import type { GameVersion } from "../modules/game/domain/gameVersion.js";
import type { GameCanonicalRepository } from "../modules/game/ports/gameCanonicalRepository.js";
import type { GameVersionPublicationRepository } from "../modules/game/ports/gameVersionPublicationRepository.js";
import type { GameBundleStorageRepository } from "../ports/sandboxGames.js";
import { GamePublicationService } from "./gamePublicationService.js";
import { jsonDeepEqual } from "./jsonDeepEqual.js";

/** Official identity/version control-plane port. It contains no USER review operation. */
export interface OfficialGameBootstrapRepository extends GameVersionPublicationRepository {
  ensureOwoggIdentity(input: { slug: string; nowIso: string }): Promise<GameIdentity>;
  findVersionByContentHash(gameId: number, contentHash: string): Promise<GameVersion | null>;
  createPublishingVersion(input: {
    gameId: number;
    objectKey: string;
    contentHash: string;
    bundleBytes: number;
    nowIso: string;
  }): Promise<GameVersion>;
  ensureSlugReservation(input: { slug: string; gameId: number; nowIso: string }): Promise<void>;
  activateOwoggVersion(input: { gameId: number; versionId: number; nowIso: string }): Promise<void>;
}

export interface OfficialGameBootstrapResult {
  readonly gameId: number;
  readonly versionId: number;
  readonly reusedReadyVersion: boolean;
  readonly canonicalCreated: boolean;
}

/** Retry-safe OWOGG bootstrap. Publication bytes and state are delegated to the common engine. */
export class OfficialGameBootstrap {
  constructor(
    private readonly repository: OfficialGameBootstrapRepository,
    /** Source archive lifecycle remains an OWOGG control-plane concern. */
    private readonly storage: GameBundleStorageRepository,
    private readonly canonicals: GameCanonicalRepository,
    private readonly publication: GamePublicationService,
  ) {}

  async bootstrap(input: {
    definition: SystemGameDefinition;
    archive: Uint8Array;
    contentHash: string;
    prepared: PreparedBundle;
    nowIso: string;
  }): Promise<OfficialGameBootstrapResult> {
    const { definition, archive, contentHash, prepared, nowIso } = input;
    const identity = await this.repository.ensureOwoggIdentity({ slug: definition.slug, nowIso });
    if (identity.publisher.type !== "OWOGG" || identity.deletedAt !== null) {
      throw new Error(`Official bootstrap identity conflict for ${definition.slug}`);
    }

    let version = await this.repository.findVersionByContentHash(identity.id, contentHash);
    const readyVersion = version?.publishStatus === "READY" ? version : null;
    const reusedReadyVersion = readyVersion !== null;
    if (readyVersion) {
      version = readyVersion;
      await this.assertReadyManifest(readyVersion, contentHash);
    } else {
      if (!version) {
        version = await this.repository.createPublishingVersion({
          gameId: identity.id,
          objectKey: sourceArchiveObjectKey(identity.id, contentHash),
          contentHash,
          bundleBytes: archive.byteLength,
          nowIso,
        });
      }

      const target = {
        gameId: identity.id,
        versionId: version.id,
        contentHash,
      } as const;

      try {
        await this.storage.putObject({
          key: sourceArchiveObjectKey(identity.id, contentHash),
          bytes: archive,
          contentType: "application/zip",
        });
        await this.publication.publish({
          ...target,
          prepared,
          publishedAt: nowIso,
        });
      } catch (error) {
        await this.publication.recordFailure(target, error);
        throw error;
      }

      const published = await this.repository.findVersionByContentHash(identity.id, contentHash);
      if (!published || published.id !== version.id || published.publishStatus !== "READY") {
        throw new Error(`Official bootstrap version ${version.id} did not become READY`);
      }
      version = published;
    }

    if (!version)
      throw new Error(`Official bootstrap did not resolve a version for ${identity.id}`);
    const canonicalCreated = await this.ensureCanonical(definition, nowIso);
    if (version.publishStatus !== "READY" || version.gameId !== identity.id) {
      throw new Error(`Official bootstrap version ${version.id} is not READY for ${identity.id}`);
    }
    await this.repository.ensureSlugReservation({
      slug: definition.slug,
      gameId: identity.id,
      nowIso,
    });
    await this.repository.activateOwoggVersion({
      gameId: identity.id,
      versionId: version.id,
      nowIso,
    });

    return { gameId: identity.id, versionId: version.id, reusedReadyVersion, canonicalCreated };
  }

  private async assertReadyManifest(version: GameVersion, contentHash: string): Promise<void> {
    const manifest = await this.publication.readManifest(version.manifestKey);
    if (!manifest) throw new Error(`READY official version ${version.id} has no valid manifest`);
    if (
      manifest.gameId !== version.gameId ||
      manifest.versionId !== version.id ||
      manifest.contentHash !== contentHash
    ) {
      throw new Error(`READY official version ${version.id} manifest does not match D1 state`);
    }
  }

  private async ensureCanonical(
    definition: SystemGameDefinition,
    nowIso: string,
  ): Promise<boolean> {
    const existing = await this.canonicals.findBySlug(definition.slug);
    if (existing === null) {
      const document = systemGameDefinitionToGameCanonicalDocument(definition, nowIso);
      await this.canonicals.save(document);
      const readBack = await this.canonicals.findBySlug(definition.slug);
      if (readBack === null || !jsonDeepEqual(readBack, document)) {
        throw new Error(`Official canonical write parity failed for ${definition.slug}`);
      }
      return true;
    }

    const expected: GameCanonicalDocument = systemGameDefinitionToGameCanonicalDocument(
      definition,
      existing.updatedAt,
    );
    // Schema v1 documents normalize to official:false because the old format did not carry this
    // metadata. Only this trusted OWOGG bootstrap path may upgrade that presentation fact.
    if (!existing.publisher.official) {
      const normalizedAsOfficial = { ...existing, publisher: { official: true as const } };
      if (jsonDeepEqual(normalizedAsOfficial, expected)) {
        await this.canonicals.save(expected);
        const readBack = await this.canonicals.findBySlug(definition.slug);
        if (readBack === null || !jsonDeepEqual(readBack, expected)) {
          throw new Error(`Official canonical upgrade parity failed for ${definition.slug}`);
        }
        return true;
      }
    }
    if (!jsonDeepEqual(existing, expected)) {
      throw new Error(`Official canonical conflict for ${definition.slug}`);
    }
    return false;
  }
}
