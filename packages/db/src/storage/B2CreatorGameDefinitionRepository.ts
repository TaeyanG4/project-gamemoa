import type {
  CreatorGameDefinitionRepository,
  CreatorGameCanonicalDocument,
  GameBundleStorageRepository,
} from "@owogg/core";
import {
  creatorGameDefinitionObjectKey,
  serializeCreatorGameCanonicalDocument,
  parseCreatorGameCanonicalDocument,
} from "@owogg/core";

/**
 * B2-backed {@link CreatorGameDefinitionRepository} — Stage A of the Creator B2 Canonical
 * Registry migration (see domain/creatorGameCanonicalDocument.ts's own doc comment for the full
 * B2/D1 boundary this is the storage half of).
 *
 * Deliberately composes an existing {@link GameBundleStorageRepository} (typically the same
 * `BackblazeB2GameBundleRepository` bundle storage already uses — see that class's own doc
 * comment) as a plain byte store, rather than talking to B2/aws4fetch directly. That class is
 * already exactly the generic "put/get/delete bytes by key" abstraction this needs — it has no
 * bundle-specific logic in it at all — so reusing it here is composition, not a new B2 client:
 * this adapter adds nothing B2-specific of its own, only JSON serialize/parse and the fail-closed
 * validation domain/creatorGameCanonicalDocument.ts's own parser already implements. Key layout
 * (creator-games/<slug>/definition.json) stays entirely separate from bundle storage's own
 * games/<gameId>/<versionId>/... and uploads/<gameId>/... prefixes — see
 * {@link creatorGameDefinitionObjectKey}'s own doc comment for why.
 *
 * All format/shape validation — malformed JSON, an unsupported schemaVersion, a slug mismatch, an
 * invalid document shape — happens in {@link parseCreatorGameCanonicalDocument} (core, provider-
 * neutral, unit-tested there with plain strings). This adapter's own job is narrow: decode bytes
 * to text, call that parser, and propagate whatever it throws — never catch the
 * `CreatorGameCanonicalDocumentError` it raises here and fall back to null/an empty document. A 404
 * (nothing ever written) is the only case that legitimately becomes `null`; everything else that
 * went wrong stays a thrown error, all the way up to the caller.
 */
export class B2CreatorGameDefinitionRepository implements CreatorGameDefinitionRepository {
  constructor(private readonly storage: GameBundleStorageRepository) {}

  async findBySlug(slug: string): Promise<CreatorGameCanonicalDocument | null> {
    const bytes = await this.storage.getObject(creatorGameDefinitionObjectKey(slug));
    if (bytes === null) return null;

    const jsonText = new TextDecoder().decode(bytes);
    // Deliberately not caught here — see this class's own doc comment on why every failure past
    // "the object doesn't exist at all" must stay a thrown error, never a silent null/default.
    return parseCreatorGameCanonicalDocument(jsonText, slug);
  }

  async save(document: CreatorGameCanonicalDocument): Promise<void> {
    const jsonText = serializeCreatorGameCanonicalDocument(document);
    await this.storage.putObject({
      key: creatorGameDefinitionObjectKey(document.slug),
      bytes: new TextEncoder().encode(jsonText),
      contentType: "application/json",
    });
  }

  async delete(slug: string): Promise<void> {
    await this.storage.deleteObject(creatorGameDefinitionObjectKey(slug));
  }
}
