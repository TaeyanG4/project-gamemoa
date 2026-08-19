import type { CreatorGameCanonicalDocument } from "../domain/creatorGameCanonicalDocument.js";

/**
 * Persistence port for a Creator game's canonical definition (Stage A — see
 * domain/creatorGameCanonicalDocument.ts's own doc comment for the full B2/D1 boundary). Deliberately
 * minimal: no listing, no B2 prefix/index operation. A future GameRegistry that also resolves
 * creator games can enumerate identities from D1 (which already has to track every game row
 * regardless) and resolve each one's canonical definition through {@link findBySlug} here — that
 * is what lets this port stay this small without needing a separate B2-side `registry-index.json`
 * (and the write-concurrency problem a shared index file would introduce) at all.
 *
 * Provider-neutral on purpose — nothing above `packages/db/src/storage/` may know a canonical
 * document happens to live in Backblaze B2 today, matching {@link GameBundleStorageRepository}'s
 * own separation (ports/sandboxGames.ts).
 */
export interface CreatorGameDefinitionRepository {
  /** `null` for a slug with no canonical document yet — never a thrown error. A malformed or
   * unreadable STORED document, by contrast, always throws (see the B2 adapter's own doc
   * comment) — "nothing was ever written" and "something was written but it's broken" must stay
   * distinguishable, not both collapse into null. */
  findBySlug(slug: string): Promise<CreatorGameCanonicalDocument | null>;
  /** Overwrites whatever document (if any) currently exists at `document.slug`'s key. Callers are
   * responsible for constructing a complete, valid document — this port does no merging. */
  save(document: CreatorGameCanonicalDocument): Promise<void>;
  /** Idempotent — deleting an already-absent slug is not an error, matching
   * {@link GameBundleStorageRepository.deleteObject}'s own 404-is-success convention. */
  delete(slug: string): Promise<void>;
}
