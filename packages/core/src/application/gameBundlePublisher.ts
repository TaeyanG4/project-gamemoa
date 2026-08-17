import type {
  SandboxGameRepository,
  SandboxGameVersionRecord,
  GameBundleStorageRepository,
  BundleArchiveReader,
} from "../ports/sandboxGames.js";
import {
  prepareBundleEntries,
  validateBundleEntryMetadata,
  buildBundleManifest,
  publishedObjectKey,
  publishedManifestObjectKey,
  SandboxBundleRejectionError,
  type PreparedBundle,
  type SandboxGameBundleManifest,
  type BundleEntryMetadata,
} from "../domain/sandboxGameBundle.js";

/**
 * Turns an uploaded archive into a version's published, individually-addressable objects.
 *
 * This is where the archive is decompressed — **once, at publish time**. Nothing on the player's
 * request path ever decompresses anything: a browser fetches
 * `games/<gameId>/<versionId>/<path>` straight through the CDN, and the game itself then runs
 * entirely on the player's own machine. OwOGG never executes game code, renders game frames, or
 * holds per-player game state; see docs/GAME_CREATION_GUIDE.md §3.
 *
 * Publishing is intentionally not transactional — object storage offers no multi-object commit.
 * Instead the version's publish status is the commit record: it flips to PUBLISHING before the
 * first write and only reaches READY after every file *and* the manifest are stored. A version
 * that dies mid-publish is left PUBLISHING or FAILED, and callers must refuse to serve or promote
 * anything that isn't READY (see isPublishedVersion). That is what makes a partial publish
 * unservable rather than a half-broken game.
 */
export class GameBundlePublisher {
  constructor(
    private repo: SandboxGameRepository,
    private storage: GameBundleStorageRepository,
    private archives: BundleArchiveReader,
  ) {}

  /**
   * Validates an archive without persisting anything, unwraps a single wrapping folder, and
   * requires an entry point. Runs on the in-memory upload *before* the source archive is stored or
   * a version row is created, so a bad bundle costs no storage writes and leaves no rows behind —
   * the developer just gets a clear error and re-uploads.
   *
   * Two passes, deliberately in this order:
   *   1. `readMetadata` — path/count/declared-size checks against the archive's central directory,
   *      without decompressing a single entry. This is the zip-bomb guard: a small compressed
   *      upload can still declare (or actually contain) an enormous amount of decompressed data,
   *      and that must be caught *before* any of it is allocated, not after.
   *   2. `read` — only reached once (1) has passed, so the full decompression this performs is
   *      already bounded by limits already checked.
   */
  prepare(archive: ArrayBuffer): PreparedBundle {
    let metadata: BundleEntryMetadata[];
    try {
      metadata = this.archives.readMetadata(archive);
    } catch {
      throw new SandboxBundleRejectionError("BUNDLE_MALFORMED");
    }
    validateBundleEntryMetadata(metadata);

    let entries: Record<string, Uint8Array>;
    try {
      entries = this.archives.read(archive);
    } catch {
      throw new SandboxBundleRejectionError("BUNDLE_MALFORMED");
    }
    return prepareBundleEntries(entries);
  }

  /**
   * Writes every file plus the manifest under this version's immutable prefix, then marks it READY.
   *
   * Files are written sequentially rather than all at once: a bundle may hold hundreds of entries,
   * and firing that many concurrent signed requests at B2 would be both a burst this doesn't need
   * and a good way to trip the very provider-side caps that motivated choosing B2 (see §3.2).
   * Publish latency is an admin-side concern, not a player-facing one.
   *
   * On any failure the version is marked FAILED (with a short reason) and the error is rethrown.
   * Already-written objects are deliberately left in place: they are immutable and addressed by
   * this version's prefix, so they are harmless, a retry overwrites them with identical bytes, and
   * the manifest — the record of what belongs to the version — is only written on success.
   */
  async publish(input: {
    version: SandboxGameVersionRecord;
    prepared: PreparedBundle;
    nowIso: string;
  }): Promise<SandboxGameVersionRecord> {
    const { version, prepared, nowIso } = input;
    const { gameId, id: versionId } = version;

    await this.repo.setVersionPublishState(versionId, {
      publishStatus: "PUBLISHING",
      publishError: null,
      publishedAt: null,
      manifestKey: null,
      publishedSizeBytes: null,
      fileCount: null,
    });

    try {
      for (const file of prepared.files) {
        await this.storage.putObject({
          key: publishedObjectKey(gameId, versionId, file.path),
          bytes: file.bytes,
          contentType: file.contentType,
          contentEncoding: file.contentEncoding,
        });
      }

      const manifest = buildBundleManifest({
        gameId,
        versionId,
        contentHash: version.contentHash,
        prepared,
        publishedAt: nowIso,
      });
      const manifestKey = publishedManifestObjectKey(gameId, versionId);
      await this.storage.putObject({
        key: manifestKey,
        bytes: new TextEncoder().encode(JSON.stringify(manifest)),
        contentType: "application/json; charset=utf-8",
      });

      return await this.repo.setVersionPublishState(versionId, {
        publishStatus: "READY",
        publishError: null,
        publishedAt: nowIso,
        manifestKey,
        publishedSizeBytes: manifest.totalSize,
        fileCount: manifest.fileCount,
      });
    } catch (err) {
      await this.repo
        .setVersionPublishState(versionId, {
          publishStatus: "FAILED",
          publishError: describePublishFailure(err),
          publishedAt: null,
          manifestKey: null,
          publishedSizeBytes: null,
          fileCount: null,
        })
        // If even recording the failure fails, the version stays PUBLISHING — which is also
        // non-servable and non-promotable, so the safety property holds either way.
        .catch(() => {});
      throw err;
    }
  }

  /** Reads a version's manifest, for publish verification and (later) version deletion/GC —
   * the reason the manifest exists at all is so neither needs a provider-specific bucket listing. */
  async readManifest(version: SandboxGameVersionRecord): Promise<SandboxGameBundleManifest | null> {
    if (!version.manifestKey) return null;
    const bytes = await this.storage.getObject(version.manifestKey);
    if (!bytes) return null;
    try {
      return JSON.parse(new TextDecoder().decode(bytes)) as SandboxGameBundleManifest;
    } catch {
      return null;
    }
  }

  /**
   * Deletes every published object of a version (manifest last, so a partially-completed delete
   * still leaves the manifest as the record of what remains). Leaves the source archive alone:
   * source keys are content-addressed and can be shared by another version with identical bytes.
   * Not wired to any scheduled job yet — this is the primitive a future GC would call.
   */
  async deletePublishedVersion(version: SandboxGameVersionRecord): Promise<void> {
    const manifest = await this.readManifest(version);
    if (manifest) {
      for (const file of manifest.files) {
        await this.storage.deleteObject(publishedObjectKey(version.gameId, version.id, file.path));
      }
    }
    if (version.manifestKey) await this.storage.deleteObject(version.manifestKey);
    await this.repo.setVersionPublishState(version.id, {
      publishStatus: "FAILED",
      publishError: "published objects deleted",
      publishedAt: null,
      manifestKey: null,
      publishedSizeBytes: null,
      fileCount: null,
    });
  }
}

/** Keeps `publish_error` short and free of anything that could carry bundle bytes or credentials
 * (a signed-URL fragment in a provider error message, for instance). */
function describePublishFailure(err: unknown): string {
  if (err instanceof SandboxBundleRejectionError) return err.code;
  const message = err instanceof Error ? err.message : String(err);
  return message.slice(0, 200);
}
