/**
 * SYSTEM (official OwOGG) game bundle domain: storage key layout + published-version manifest, for
 * a standalone HTML/JS bundle served the exact same way a Creator game's published version already
 * is. See modules/game/domain/gameOwner.ts's own doc comment: SYSTEM and CREATOR games are meant
 * to converge on "registered, versioned, published to immutable object storage, served from the
 * isolated game origin, and played through the same host" — this is that convergence for the
 * publish/storage layer specifically (feat/official-game-publisher-foundation).
 *
 * Deliberately parallel to, not a modification of, sandboxGameBundle.ts. A SYSTEM game has no D1
 * row at all — no sandbox_games/sandbox_game_versions entry, no developer, no review lifecycle
 * (see SystemGameOwner: "no submitting user, no review workflow") — so its identity here is
 * (slug, version): plain strings, never a D1-assigned integer. `version` is meant to be the
 * bundle's own content hash (see domain/contentHash.ts's sha256Hex, the same function Creator
 * uploads already use for `sandbox_game_versions.content_hash`) — an immutable, database-free
 * version identifier that needs no row anywhere to exist. Republishing byte-identical content is
 * naturally idempotent (same hash, same key, same bytes already there); any real change gets a new
 * hash and therefore a new, never-before-served key. This module doesn't compute the hash itself —
 * that stays the caller's job, exactly like GameBundlePublisher never computes content_hash either.
 *
 * Entry validation, MIME resolution, and the archive-to-PreparedBundle pipeline
 * (prepareBundleFromArchive/prepareBundleEntries/validateBundleEntryMetadata/
 * resolveBundleContentType, all in sandboxGameBundle.ts) are reused completely unchanged by
 * SystemGameBundlePublisher — none of that logic has any Creator-specific identity baked into it.
 * Only the key layout and manifest shape below are SYSTEM-specific.
 */

import { PUBLISHED_MANIFEST_FILENAME, type PreparedBundle } from "./sandboxGameBundle.js";

// ── Storage key layout ────────────────────────────────────────────────────────
//
// Deliberately under distinct `official-*` prefixes, not folded into Creator's `uploads/`/`games/`
// prefixes — slug (string) and gameId (number) could never actually collide as path segments, but
// a reader shouldn't have to know that to tell a SYSTEM key from a Creator one at a glance.

/** Where a version's original uploaded archive lives, content-addressed by its own hash — same
 * reasoning as sourceArchiveObjectKey: the hash is known before anything else is, so storing
 * "bytes at a key the hash already determines" needs no prior write to learn an id from. */
export function systemGameSourceArchiveObjectKey(slug: string, contentHash: string): string {
  return `official-uploads/${slug}/${contentHash}.zip`;
}

/** Prefix owning every published object of one version — the unit a future GC would delete. */
export function systemGamePublishedVersionPrefix(slug: string, version: string): string {
  return `official-games/${slug}/${version}/`;
}

/** `path` must already be normalized by normalizeBundleEntryPath (sandboxGameBundle.ts) — reused
 * unchanged, see this module's own doc comment. */
export function systemGamePublishedObjectKey(slug: string, version: string, path: string): string {
  return `${systemGamePublishedVersionPrefix(slug, version)}${path}`;
}

/** Same reserved filename Creator publishes use (PUBLISHED_MANIFEST_FILENAME) — sits alongside
 * the published files, so it can never collide with a bundle entry. */
export function systemGamePublishedManifestObjectKey(slug: string, version: string): string {
  return `${systemGamePublishedVersionPrefix(slug, version)}${PUBLISHED_MANIFEST_FILENAME}`;
}

// ── Manifest ─────────────────────────────────────────────────────────────────

export interface SystemGameBundleManifestFile {
  path: string;
  size: number;
  contentType: string;
  contentEncoding?: string | undefined;
}

/** Same purpose as SandboxGameBundleManifest — the one object a caller reads to know exactly
 * which keys belong to a published version, without a provider-specific bucket listing. */
export interface SystemGameBundleManifest {
  slug: string;
  version: string;
  entry: string;
  fileCount: number;
  totalSize: number;
  publishedAt: string;
  files: SystemGameBundleManifestFile[];
}

export function buildSystemGameBundleManifest(input: {
  slug: string;
  version: string;
  prepared: PreparedBundle;
  publishedAt: string;
}): SystemGameBundleManifest {
  return {
    slug: input.slug,
    version: input.version,
    entry: input.prepared.entry,
    fileCount: input.prepared.files.length,
    totalSize: input.prepared.totalSize,
    publishedAt: input.publishedAt,
    files: input.prepared.files.map((f) => ({
      path: f.path,
      size: f.bytes.byteLength,
      contentType: f.contentType,
      contentEncoding: f.contentEncoding,
    })),
  };
}
