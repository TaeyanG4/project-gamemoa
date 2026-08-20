import type {
  GameCanonicalDocument,
  GameCanonicalRepository,
  GameBundleStorageRepository,
} from "@owogg/core";
import {
  gameCanonicalObjectKey,
  serializeGameCanonicalDocument,
  parseGameCanonicalDocument,
} from "@owogg/core";

/**
 * B2-backed {@link GameCanonicalRepository} — Unified Game Platform Stage U-2's storage half of the
 * generic canonical (`GameCanonicalDocument`, modules/game/domain/gameCanonicalDocument.ts, Stage
 * U-1). Not wired into any container/route/production runtime by this Stage — see
 * application/genericCanonicalMigration.ts's own top doc comment for what this class is for so far
 * (a non-destructive migration/parity tool's destination port).
 *
 * Deliberately composes an existing {@link GameBundleStorageRepository} (the exact same
 * `BackblazeB2GameBundleRepository` bundle storage and `B2CreatorGameDefinitionRepository` already
 * reuse — see that class's own doc comment) as a plain byte store, rather than talking to
 * B2/aws4fetch directly. No new B2 client is created here — this adapter adds nothing B2-specific
 * of its own beyond JSON serialize/parse and the fail-closed validation
 * {@link parseGameCanonicalDocument} (core, provider-neutral) already implements. Key layout
 * (`game-definitions/<slug>/definition.json`, {@link gameCanonicalObjectKey}) stays entirely
 * separate from every other existing prefix (`creator-games/`, `games/<gameId>/<versionId>/...`,
 * `uploads/<gameId>/...`, `official-games/<slug>/<version>/...`) — see that function's own doc
 * comment for why.
 *
 * `findBySlug`: all format/shape/semantic validation — malformed JSON, an unsupported
 * schemaVersion, a slug mismatch, an invalid document shape, or a domain-invalid policy (inverted
 * score range, `score: null` + `leaderboard: true`, out-of-range `xpPerCompletion`) — happens in
 * `parseGameCanonicalDocument`. This adapter's own job is narrow: decode bytes to text, call that
 * parser, and propagate whatever it throws — never catch the `GameCanonicalDocumentError` it raises
 * here and fall back to null/an empty document. A 404 (nothing ever written) is the only case that
 * legitimately becomes `null`; everything else that went wrong stays a thrown error, all the way up
 * to the caller. No D1 fallback of any kind — a missing/broken B2 object is never silently patched
 * over by reading anywhere else.
 *
 * `save`: the `GameCanonicalDocument` TypeScript type alone does not guarantee the semantic
 * invariants `parseGameCanonicalDocument` enforces (e.g. nothing at the type level stops
 * `score: null` from being paired with `leaderboard: true`) — a caller could hand this method a
 * structurally well-typed but domain-invalid document. So `save` serializes and then re-parses
 * through the exact same standard parser `findBySlug` uses, BEFORE ever calling `storage.putObject`
 * — an invalid document throws here and nothing is written, rather than landing in B2 as bytes this
 * same class could never successfully read back. This is a round-trip through the existing Stage
 * U-1 parser, not a second validation framework.
 */
export class B2GameCanonicalRepository implements GameCanonicalRepository {
  constructor(private readonly storage: GameBundleStorageRepository) {}

  async findBySlug(slug: string): Promise<GameCanonicalDocument | null> {
    const bytes = await this.storage.getObject(gameCanonicalObjectKey(slug));
    if (bytes === null) return null;

    const jsonText = new TextDecoder().decode(bytes);
    // Deliberately not caught here — see this class's own doc comment on why every failure past
    // "the object doesn't exist at all" must stay a thrown error, never a silent null/default.
    return parseGameCanonicalDocument(jsonText, slug);
  }

  async save(document: GameCanonicalDocument): Promise<void> {
    const jsonText = serializeGameCanonicalDocument(document);
    // Validate-before-write — see this class's own doc comment. Throws (and never reaches
    // storage.putObject) for a document this same repository's own findBySlug could not later
    // read back successfully.
    parseGameCanonicalDocument(jsonText, document.slug);
    await this.storage.putObject({
      key: gameCanonicalObjectKey(document.slug),
      bytes: new TextEncoder().encode(jsonText),
      contentType: "application/json",
    });
  }

  async delete(slug: string): Promise<void> {
    await this.storage.deleteObject(gameCanonicalObjectKey(slug));
  }
}
