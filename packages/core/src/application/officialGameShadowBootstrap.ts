import type { PreparedBundle } from "../domain/sandboxGameBundle.js";
import {
  buildBundleManifest,
  publishedManifestObjectKey,
  publishedObjectKey,
  sourceArchiveObjectKey,
} from "../domain/sandboxGameBundle.js";
import { systemGameDefinitionToGameCanonicalDocument } from "../modules/game/domain/gameCanonicalMigration.js";
import type { SystemGameDefinition } from "../modules/game/domain/gameDefinition.js";
import type { GameCanonicalDocument } from "../modules/game/domain/gameCanonicalDocument.js";
import type { GameIdentity } from "../modules/game/domain/gameIdentity.js";
import type { GameVersion } from "../modules/game/domain/gameVersion.js";
import type { GameCanonicalRepository } from "../modules/game/ports/gameCanonicalRepository.js";
import type { GameBundleStorageRepository } from "../ports/sandboxGames.js";
import { jsonDeepEqual } from "./jsonDeepEqual.js";

/**
 * Narrow persistence boundary for B-1's official shadow state. It intentionally exposes no USER
 * review workflow operation: official games have OWOGG authority only, and never touch
 * sandbox_games/sandbox_game_versions/audit rows.
 */
export interface OfficialGameShadowRepository {
  ensureOwoggIdentity(input: { slug: string; nowIso: string }): Promise<GameIdentity>;
  findVersionByContentHash(gameId: number, contentHash: string): Promise<GameVersion | null>;
  createPublishingVersion(input: {
    gameId: number;
    objectKey: string;
    contentHash: string;
    bundleBytes: number;
    nowIso: string;
  }): Promise<GameVersion>;
  retryPublishingVersion(versionId: number): Promise<GameVersion>;
  markVersionReady(input: {
    versionId: number;
    publishedAt: string;
    manifestKey: string;
    publishedSizeBytes: number;
    fileCount: number;
  }): Promise<GameVersion>;
  markVersionFailed(versionId: number, reason: string): Promise<void>;
  ensureSlugReservation(input: { slug: string; gameId: number; nowIso: string }): Promise<void>;
  activateOwoggVersion(input: { gameId: number; versionId: number; nowIso: string }): Promise<void>;
}

export interface OfficialGameShadowBootstrapResult {
  readonly gameId: number;
  readonly versionId: number;
  readonly reusedReadyVersion: boolean;
  readonly canonicalCreated: boolean;
}

/**
 * B-1's retry-safe, cross-store convergence flow. D1 and object storage do not share a
 * transaction, so the D1 live pointer is changed only after the generic bundle manifest and
 * canonical document are present and the version is READY. A failed publish remains non-live and
 * can be retried under the same numeric version and content hash.
 */
export class OfficialGameShadowBootstrap {
  constructor(
    private readonly repository: OfficialGameShadowRepository,
    private readonly storage: GameBundleStorageRepository,
    private readonly canonicals: GameCanonicalRepository,
  ) {}

  async bootstrap(input: {
    definition: SystemGameDefinition;
    archive: Uint8Array;
    contentHash: string;
    prepared: PreparedBundle;
    nowIso: string;
  }): Promise<OfficialGameShadowBootstrapResult> {
    const { definition, archive, contentHash, prepared, nowIso } = input;
    const identity = await this.repository.ensureOwoggIdentity({ slug: definition.slug, nowIso });
    if (identity.publisher.type !== "OWOGG" || identity.deletedAt !== null) {
      throw new Error(`Official shadow identity conflict for ${definition.slug}`);
    }

    let version = await this.repository.findVersionByContentHash(identity.id, contentHash);
    let reusedReadyVersion = version?.publishStatus === "READY";
    if (version?.publishStatus === "READY") {
      await this.assertReadyManifest(version, contentHash);
    } else {
      if (version) {
        version = await this.repository.retryPublishingVersion(version.id);
      } else {
        version = await this.repository.createPublishingVersion({
          gameId: identity.id,
          objectKey: sourceArchiveObjectKey(identity.id, contentHash),
          contentHash,
          bundleBytes: archive.byteLength,
          nowIso,
        });
      }

      try {
        await this.publishGenericBundle({
          gameId: identity.id,
          versionId: version.id,
          contentHash,
          archive,
          prepared,
          nowIso,
        });
      } catch (error) {
        await this.repository
          .markVersionFailed(version.id, describeFailure(error))
          // A PUBLISHING version is also non-live, so a failure to record FAILED cannot make a
          // partial B2 upload servable.
          .catch(() => {});
        throw error;
      }
    }

    let canonicalCreated = false;
    try {
      canonicalCreated = await this.ensureCanonical(definition, nowIso);
      if (!reusedReadyVersion) {
        const manifest = buildBundleManifest({
          gameId: identity.id,
          versionId: version.id,
          contentHash,
          prepared,
          publishedAt: nowIso,
        });
        version = await this.repository.markVersionReady({
          versionId: version.id,
          publishedAt: nowIso,
          manifestKey: publishedManifestObjectKey(identity.id, version.id),
          publishedSizeBytes: manifest.totalSize,
          fileCount: manifest.fileCount,
        });
      }
      if (version.publishStatus !== "READY" || version.gameId !== identity.id) {
        throw new Error(
          `Official shadow version ${version.id} is not a READY version of ${identity.id}`,
        );
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
    } catch (error) {
      if (!reusedReadyVersion) {
        await this.repository.markVersionFailed(version.id, describeFailure(error)).catch(() => {});
      }
      throw error;
    }

    return {
      gameId: identity.id,
      versionId: version.id,
      reusedReadyVersion,
      canonicalCreated,
    };
  }

  private async publishGenericBundle(input: {
    gameId: number;
    versionId: number;
    contentHash: string;
    archive: Uint8Array;
    prepared: PreparedBundle;
    nowIso: string;
  }): Promise<void> {
    await this.storage.putObject({
      key: sourceArchiveObjectKey(input.gameId, input.contentHash),
      bytes: input.archive,
      contentType: "application/zip",
    });
    for (const file of input.prepared.files) {
      await this.storage.putObject({
        key: publishedObjectKey(input.gameId, input.versionId, file.path),
        bytes: file.bytes,
        contentType: file.contentType,
        contentEncoding: file.contentEncoding,
      });
    }
    const manifest = buildBundleManifest({
      gameId: input.gameId,
      versionId: input.versionId,
      contentHash: input.contentHash,
      prepared: input.prepared,
      publishedAt: input.nowIso,
    });
    await this.storage.putObject({
      key: publishedManifestObjectKey(input.gameId, input.versionId),
      bytes: new TextEncoder().encode(JSON.stringify(manifest)),
      contentType: "application/json; charset=utf-8",
    });
  }

  private async assertReadyManifest(version: GameVersion, contentHash: string): Promise<void> {
    if (!version.manifestKey) {
      throw new Error(`READY official version ${version.id} has no generic manifest key`);
    }
    const bytes = await this.storage.getObject(version.manifestKey);
    if (!bytes) throw new Error(`READY official version ${version.id} has no generic manifest`);
    let manifest: unknown;
    try {
      manifest = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new Error(`READY official version ${version.id} has malformed generic manifest`);
    }
    if (
      !manifest ||
      typeof manifest !== "object" ||
      (manifest as { gameId?: unknown }).gameId !== version.gameId ||
      (manifest as { versionId?: unknown }).versionId !== version.id ||
      (manifest as { contentHash?: unknown }).contentHash !== contentHash
    ) {
      throw new Error(
        `READY official version ${version.id} generic manifest does not match D1 state`,
      );
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

    // System definitions deliberately carry no mutable timestamp source. Preserve an existing
    // canonical's timestamp while comparing every semantic field so unchanged deploys reuse it,
    // whereas changed static semantics fail closed rather than overwriting unexplained state.
    const expected: GameCanonicalDocument = systemGameDefinitionToGameCanonicalDocument(
      definition,
      existing.updatedAt,
    );
    if (!jsonDeepEqual(existing, expected)) {
      throw new Error(`Official canonical conflict for ${definition.slug}`);
    }
    return false;
  }
}

function describeFailure(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 200);
}
