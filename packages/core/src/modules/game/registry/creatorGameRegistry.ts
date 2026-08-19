/**
 * Stage C-1 of the Creator B2 Canonical Registry migration — a {@link GameRegistry} that resolves
 * CREATOR-owned {@link GameDefinition}s by combining two provider-neutral ports:
 *
 *   - `SandboxGameRepository` (D1) — owner identity (`developerUserId`) and runtime/lifecycle
 *     state (`liveVersionId`, `visibility`, `deletedAt`) — never metadata.
 *   - `CreatorGameDefinitionRepository` (B2) — title/shortDescription/description/genre/mode/
 *     policy/presentation, the game's own canonical "what this game is" — never identity or
 *     runtime state (see domain/creatorGameCanonicalDocument.ts's own doc comment for the full
 *     B2/D1 boundary this enforces).
 *
 * Deliberately depends on both ports, never a concrete B2/D1 adapter — `packages/db`'s
 * `B2CreatorGameDefinitionRepository`/`D1SandboxGameRepository` are composed in at the
 * composition root (a later Stage; not this PR — see this file's own "not done here" note below).
 *
 * D1's title/description/genre/mode/score columns are NEVER read here, even though they exist and
 * are populated (they're what Stage B-1/B-2's mapper and backfill tool read) — this registry reads
 * ONLY the identity/runtime columns off `SandboxGameRecord` (`developerUserId`, `logoKey`,
 * `liveVersionId`, `visibility`, `deletedAt`) and gets every metadata/policy field from the B2
 * canonical document instead. This isn't "compare D1 and B2, prefer B2 on conflict" — D1's
 * duplicate copies are simply never consulted for those fields, which is what makes B2 the source
 * of truth structurally, not by convention.
 *
 * Fail-closed, not fallback-to-D1, when B2 disagrees with what D1's identity implies:
 *   - D1 has an identity row but no canonical document exists at all → `CreatorGameRegistryError`
 *     ("CANONICAL_MISSING"), never a silent `null` (a `null` would read as "not a game", but a
 *     game_id genuinely exists — this is a real inconsistency, not an absent game).
 *   - The canonical document is malformed, or the storage read itself fails →
 *     `CreatorGameDefinitionRepository.findBySlug` already throws in both cases (see that port's
 *     own doc comment); this registry does not catch either one. Never caught, never swallowed,
 *     never turned into a fallback read of D1's own duplicate metadata columns.
 *
 * NOT done in this PR (see this Stage's own task description): no composition-root wiring
 * (apps/api/src/container.ts stays untouched — GameRegistry is still `StaticGameRegistry
 * (GAME_DEFINITIONS)`, SYSTEM-only), no SYSTEM+CREATOR composite registry, no B2/D1 writes.
 */

import type { GameDefinition } from "../domain/gameDefinition.js";
import type { CreatorGameCanonicalDocument } from "../../../domain/creatorGameCanonicalDocument.js";
import { projectCreatorGameStatus } from "../domain/creatorGameStatus.js";
import type { GameRegistry } from "../ports/gameRegistry.js";
import type { SandboxGameRecord, SandboxGameRepository } from "../../../ports/sandboxGames.js";
import type { CreatorGameDefinitionRepository } from "../../../ports/creatorGameDefinition.js";

export const CREATOR_GAME_REGISTRY_ERROR_REASONS = ["CANONICAL_MISSING"] as const;
export type CreatorGameRegistryErrorReason = (typeof CREATOR_GAME_REGISTRY_ERROR_REASONS)[number];

/**
 * Thrown by {@link CreatorGameRegistry} for an inconsistent-state slug — never for a malformed
 * canonical document or a storage failure, which propagate as whatever
 * `CreatorGameDefinitionRepository.findBySlug` itself throws (a `CreatorGameCanonicalDocumentError`
 * or a raw storage `Error`) — this registry adds nothing on top of those, deliberately, so a
 * caller inspecting the error still sees the real cause.
 */
export class CreatorGameRegistryError extends Error {
  constructor(
    public readonly reason: CreatorGameRegistryErrorReason,
    public readonly slug: string,
  ) {
    super(`CreatorGameRegistry: ${reason} for slug "${slug}"`);
    this.name = "CreatorGameRegistryError";
  }
}

/**
 * Builds a CREATOR {@link GameDefinition} from a D1 identity/runtime row and its B2 canonical
 * document — pure, no I/O. `row` and `document` are assumed already matched to the same slug (the
 * only caller, {@link CreatorGameRegistry}, guarantees this by construction: `document` always
 * comes from `canonicalRepo.findBySlug(row.slug)`).
 */
export function projectCreatorGameDefinition(
  row: SandboxGameRecord,
  document: CreatorGameCanonicalDocument,
): GameDefinition {
  return {
    slug: row.slug,
    owner: { type: "CREATOR", userId: row.developerUserId },

    title: document.title,
    shortDescription: document.shortDescription,
    description: document.description,

    status: projectCreatorGameStatus(row),

    // No difficulty concept exists in the Creator canonical schema today — undefined, not a
    // fabricated single-tier default.
    difficulty: undefined,
    // Every Creator game is `false` today — there is no session recording/replay feature
    // anywhere on the Creator platform (CreatorGameHost never records one), the same
    // "false for every game" fact SYSTEM's own manifests currently declare, not a Creator-
    // specific limitation.
    supportsReplay: false,

    policy: document.policy,
    presentation: document.presentation,

    genre: document.genre,
    mode: document.mode,
    hasLogo: row.logoKey !== null,
  };
}

export class CreatorGameRegistry implements GameRegistry {
  constructor(
    private readonly sandboxGames: SandboxGameRepository,
    private readonly canonicalDefinitions: CreatorGameDefinitionRepository,
  ) {}

  async findBySlug(slug: string): Promise<GameDefinition | null> {
    // findBySlug's own semantics already exclude deleted_at rows (SandboxGameRepository's own
    // doc comment / D1SandboxGameRepository's WHERE clause) — a deleted Creator game resolves
    // null here for free, with no special-casing needed in this registry.
    const row = await this.sandboxGames.findBySlug(slug);
    if (row === null) {
      return null;
    }

    // Deliberately not wrapped in try/catch: a malformed document or a storage failure must
    // propagate exactly as CreatorGameDefinitionRepository.findBySlug throws it — see this file's
    // own top doc comment on why nothing here swallows or falls back for either case.
    const document = await this.canonicalDefinitions.findBySlug(slug);
    if (document === null) {
      throw new CreatorGameRegistryError("CANONICAL_MISSING", slug);
    }

    return projectCreatorGameDefinition(row, document);
  }

  /**
   * Enumerates every non-deleted Creator D1 row, in D1's own `listAll()` order (never re-sorted
   * here), and projects each one's canonical document. One row's `CANONICAL_MISSING` — or a
   * malformed document, or a storage failure — aborts the whole call rather than silently
   * producing a registry that's missing a known row: a partial list here would read as "this game
   * doesn't exist" to every caller, which is false for a row D1 still has an identity for.
   */
  async listAll(): Promise<readonly GameDefinition[]> {
    const rows = await this.sandboxGames.listAll();
    const definitions: GameDefinition[] = [];

    for (const row of rows) {
      if (row.deletedAt !== null) continue;

      const document = await this.canonicalDefinitions.findBySlug(row.slug);
      if (document === null) {
        throw new CreatorGameRegistryError("CANONICAL_MISSING", row.slug);
      }
      definitions.push(projectCreatorGameDefinition(row, document));
    }

    return definitions;
  }
}
