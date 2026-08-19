/**
 * Unified Game Platform, Stage U-1 — persistence port for a game's canonical definition, provider-
 * neutral (this file, and everything above `packages/db/src/storage/`, may not know a canonical
 * document happens to live in Backblaze B2 — same separation `CreatorGameDefinitionRepository`,
 * ports/creatorGameDefinition.ts, already establishes for the Creator-only predecessor of this
 * port). Deliberately minimal: no listing, no B2 prefix/index operation — same reasoning as
 * `CreatorGameDefinitionRepository`'s own doc comment (a future `RuntimeGameRegistry` can
 * enumerate identities from D1, which already has to track every game row regardless, and resolve
 * each one's canonical definition through {@link findBySlug} here).
 *
 * NOT wired to any adapter, container, or route in this PR — see gameCanonicalDocument.ts's own
 * top doc comment for the full list of what stays unchanged. A future Stage builds a
 * `B2GameCanonicalRepository` (or similarly named) adapter, reusing the exact same
 * `GameBundleStorageRepository`/`BackblazeB2GameBundleRepository` composition
 * `B2CreatorGameDefinitionRepository` already established — no new B2 client is expected to be
 * needed for that either.
 */

import type { GameCanonicalDocument } from "../domain/gameCanonicalDocument.js";

export interface GameCanonicalRepository {
  /** `null` for a slug with no canonical document yet — never a thrown error. A malformed or
   * unreadable STORED document, by contrast, always throws — "nothing was ever written" and
   * "something was written but it's broken" must stay distinguishable, not both collapse into
   * null (same convention as `CreatorGameDefinitionRepository.findBySlug`). */
  findBySlug(slug: string): Promise<GameCanonicalDocument | null>;
  /** Unconditionally overwrites whatever document (if any) currently exists at `document.slug`'s
   * key — there is no conditional-write/create-if-absent variant on this port (see
   * `CreatorGameDefinitionRepository.save`'s own doc comment on why: no such primitive exists on
   * the underlying B2 S3-compatible API). Any "don't overwrite an existing document" guarantee is
   * the caller's responsibility. Callers are also responsible for constructing a complete, valid
   * document — this port does no merging. */
  save(document: GameCanonicalDocument): Promise<void>;
  /** Idempotent — deleting an already-absent slug is not an error. */
  delete(slug: string): Promise<void>;
}
