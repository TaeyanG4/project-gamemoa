import type { BundleArchiveReader, GameBundleStorageRepository } from "../ports/sandboxGames.js";
import {
  buildBundleManifest,
  isSha256ContentHash,
  isValidSandboxGameBundleManifest,
  prepareBundleFromArchive,
  publishedManifestObjectKey,
  publishedObjectKey,
  SandboxBundleRejectionError,
  type PreparedBundle,
  type SandboxGameBundleManifest,
} from "../domain/sandboxGameBundle.js";
import type {
  GamePublicationFacts,
  GamePublicationTarget,
  GameVersionPublicationRepository,
} from "../modules/game/ports/gameVersionPublicationRepository.js";

/**
 * Provider-neutral publication engine for one already-allocated numeric game version. It owns
 * immutable file writes, manifest-last commit ordering and publication state, but knows nothing
 * about publisher authority, USER review, visibility or live-version activation.
 */
export class GamePublicationService {
  constructor(
    private readonly versions: GameVersionPublicationRepository,
    private readonly storage: GameBundleStorageRepository,
    private readonly archives?: BundleArchiveReader,
  ) {}

  prepare(archive: ArrayBuffer): PreparedBundle {
    if (!this.archives) throw new Error("Bundle archive reader is not configured");
    return prepareBundleFromArchive(this.archives, archive);
  }

  async publish(
    input: GamePublicationTarget & {
      prepared: PreparedBundle;
      publishedAt: string;
    },
  ): Promise<GamePublicationFacts> {
    const target: GamePublicationTarget = {
      gameId: input.gameId,
      versionId: input.versionId,
      contentHash: input.contentHash,
    };
    assertPublicationTarget(target);
    await this.versions.markPublishing(target);

    try {
      for (const file of input.prepared.files) {
        await this.storage.putObject({
          key: publishedObjectKey(target.gameId, target.versionId, file.path),
          bytes: file.bytes,
          contentType: file.contentType,
          contentEncoding: file.contentEncoding,
        });
      }

      const manifest = buildBundleManifest({
        gameId: target.gameId,
        versionId: target.versionId,
        contentHash: target.contentHash,
        prepared: input.prepared,
        publishedAt: input.publishedAt,
      });
      const facts: GamePublicationFacts = {
        publishedAt: input.publishedAt,
        manifestKey: publishedManifestObjectKey(target.gameId, target.versionId),
        publishedSizeBytes: manifest.totalSize,
        fileCount: manifest.fileCount,
      };
      await this.storage.putObject({
        key: facts.manifestKey,
        bytes: new TextEncoder().encode(JSON.stringify(manifest)),
        contentType: "application/json; charset=utf-8",
      });
      await this.versions.markReady(target, facts);
      return facts;
    } catch (error) {
      await this.recordFailure(target, error);
      throw error;
    }
  }

  /** Used by a control plane when a pre/post-publication step fails outside the bundle engine. */
  async recordFailure(target: GamePublicationTarget, error: unknown): Promise<void> {
    await this.versions.markFailed(target, describePublicationFailure(error)).catch(() => {});
  }

  async readManifest(manifestKey: string | null): Promise<SandboxGameBundleManifest | null> {
    if (!manifestKey) return null;
    const bytes = await this.storage.getObject(manifestKey);
    if (!bytes) return null;
    try {
      const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
      return isValidSandboxGameBundleManifest(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  /** Generic GC primitive; source archive lifecycle remains a control-plane concern. */
  async deletePublishedVersion(
    input: GamePublicationTarget & {
      manifestKey: string | null;
    },
  ): Promise<void> {
    assertPublicationTarget(input);
    const manifest = await this.readManifest(input.manifestKey);
    if (manifest) {
      if (
        manifest.gameId !== input.gameId ||
        manifest.versionId !== input.versionId ||
        manifest.contentHash !== input.contentHash
      ) {
        throw new Error("Published manifest does not match deletion target");
      }
      for (const file of manifest.files) {
        await this.storage.deleteObject(
          publishedObjectKey(input.gameId, input.versionId, file.path),
        );
      }
    }
    if (input.manifestKey) await this.storage.deleteObject(input.manifestKey);
    await this.versions.markFailed(input, "published objects deleted");
  }
}

function assertPublicationTarget(target: GamePublicationTarget): void {
  if (
    !Number.isInteger(target.gameId) ||
    target.gameId <= 0 ||
    !Number.isInteger(target.versionId) ||
    target.versionId <= 0 ||
    !isSha256ContentHash(target.contentHash)
  ) {
    throw new Error("Invalid game publication target");
  }
}

/** Deterministic and free of provider request details, signed URLs, object bytes or credentials. */
export function describePublicationFailure(error: unknown): string {
  if (error instanceof SandboxBundleRejectionError) return error.code;
  return `bundle publication failed (${error instanceof Error ? error.name : "unknown error"})`;
}
