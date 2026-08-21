/**
 * Unified Game Platform, Stage U-1 — persistence port for a game's canonical definition, provider-
 * neutral (this file, and everything above `packages/db/src/storage/`, may not know a canonical
 * document happens to live in Backblaze B2). Deliberately minimal: RuntimeGameRegistry enumerates
 * identities from D1 and resolves each canonical through {@link findBySlug} here.
 *
 * C-1 composes this port into RuntimeGameRegistry through `B2GameCanonicalRepository`, reusing the
 * same `GameBundleStorageRepository`/`BackblazeB2GameBundleRepository` composition; no second B2
 * client is needed.
 */

import type { GameCanonicalDocument } from "../domain/gameCanonicalDocument.js";

export interface GameCanonicalRepository {
  /** `null` for a slug with no canonical document yet — never a thrown error. A malformed or
   * unreadable STORED document, by contrast, always throws — "nothing was ever written" and
   * "something was written but it's broken" must stay distinguishable, not both collapse into
   * null. */
  findBySlug(slug: string): Promise<GameCanonicalDocument | null>;
  /** Unconditionally overwrites whatever document (if any) currently exists at `document.slug`'s
   * key — there is no conditional-write/create-if-absent variant on the underlying B2 API. Any
   * "don't overwrite an existing document" guarantee is
   * the caller's responsibility. Callers are also responsible for constructing a complete, valid
   * document — this port does no merging. */
  save(document: GameCanonicalDocument): Promise<void>;
  /** Idempotent — deleting an already-absent slug is not an error. */
  delete(slug: string): Promise<void>;
}
