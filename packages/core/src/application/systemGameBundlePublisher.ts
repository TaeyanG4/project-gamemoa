import type { GameBundleStorageRepository, BundleArchiveReader } from "../ports/sandboxGames.js";
import { prepareBundleFromArchive, type PreparedBundle } from "../domain/sandboxGameBundle.js";
import {
  systemGamePublishedObjectKey,
  systemGamePublishedManifestObjectKey,
  buildSystemGameBundleManifest,
  type SystemGameBundleManifest,
} from "../domain/systemGameBundle.js";

/**
 * Publishes a SYSTEM (official OwOGG) game's standalone bundle to the exact same immutable,
 * versioned object-storage model a Creator game's published version already uses —
 * GameBundleStorageRepository/BundleArchiveReader are reused completely unchanged (both are
 * already provider-neutral and identity-agnostic; see their own doc comments in
 * ports/sandboxGames.ts). This is the foundation feat/official-game-publisher-foundation exists to
 * build; no actual SYSTEM game is migrated onto it yet — that's the next PR's job, per its own
 * scope.
 *
 * Deliberately NOT GameBundlePublisher extended or reused directly: that class's publish() commits
 * through a D1 sandbox_game_versions row (repo.setVersionPublishState) a SYSTEM game simply
 * doesn't have — see modules/game/domain/gameOwner.ts's SystemGameOwner ("no submitting user, no
 * review workflow"). Forcing a SYSTEM game through that state machine would mean inventing a fake
 * D1 row for something that isn't reviewed, isn't owned by a developer, and isn't subject to a
 * review-slot quota — precisely the "don't force the Creator upload/review lifecycle onto SYSTEM"
 * boundary this class exists to hold. `prepare()` is the one piece genuinely shared: see
 * prepareBundleFromArchive's own doc comment (sandboxGameBundle.ts) for why that's reused via a
 * plain function rather than duplicated here.
 *
 * With no D1 row, there is also no separate PUBLISHING/READY/FAILED status to track: the manifest
 * itself, written last (files first, exactly like GameBundlePublisher), IS the commit record. A
 * caller checking whether (slug, version) is actually published just tries readManifest — null
 * means "not published" (including a publish that died before the manifest write), the same
 * null-is-not-an-error contract GameBundlePublisher.readManifest already has. Already-written file
 * objects from an interrupted publish are harmless leftovers for the same reason they are for
 * Creator publishes: immutable, version-addressed, and a retry overwrites them with identical
 * bytes.
 */
export class SystemGameBundlePublisher {
  constructor(
    private storage: GameBundleStorageRepository,
    private archives: BundleArchiveReader,
  ) {}

  prepare(archive: ArrayBuffer): PreparedBundle {
    return prepareBundleFromArchive(this.archives, archive);
  }

  async publish(input: {
    slug: string;
    version: string;
    prepared: PreparedBundle;
    publishedAt: string;
  }): Promise<SystemGameBundleManifest> {
    const { slug, version, prepared, publishedAt } = input;

    for (const file of prepared.files) {
      await this.storage.putObject({
        key: systemGamePublishedObjectKey(slug, version, file.path),
        bytes: file.bytes,
        contentType: file.contentType,
        contentEncoding: file.contentEncoding,
      });
    }

    const manifest = buildSystemGameBundleManifest({ slug, version, prepared, publishedAt });
    await this.storage.putObject({
      key: systemGamePublishedManifestObjectKey(slug, version),
      bytes: new TextEncoder().encode(JSON.stringify(manifest)),
      contentType: "application/json; charset=utf-8",
    });

    return manifest;
  }

  /** Reads a version's manifest — null for "not published" (never/not-yet/died-before-manifest),
   * same contract as GameBundlePublisher.readManifest. */
  async readManifest(slug: string, version: string): Promise<SystemGameBundleManifest | null> {
    const bytes = await this.storage.getObject(systemGamePublishedManifestObjectKey(slug, version));
    if (!bytes) return null;
    try {
      return JSON.parse(new TextDecoder().decode(bytes)) as SystemGameBundleManifest;
    } catch {
      return null;
    }
  }
}
