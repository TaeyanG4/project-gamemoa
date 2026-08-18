import type { GameDefinition } from "../domain/gameDefinition.js";
import type { GameRegistry } from "../ports/gameRegistry.js";

/**
 * A {@link GameRegistry} over a fixed set of definitions, held in memory.
 *
 * Backed by `GAME_DEFINITIONS` in production (compiled from `game-registry/` at build time), so
 * resolving a game costs a map lookup and no IO at all — which is why the async port signature is
 * satisfied with already-resolved promises rather than by making this do any waiting. The
 * asynchrony is there for the *other* implementation the migration anticipates, one that may have
 * to consult D1 for creator-owned games.
 *
 * Handles SYSTEM-owned games only, because that is all `game-registry/` describes today. A
 * creator-owned game is not "missing" from here so much as out of scope: `findBySlug` returning
 * null for one is correct, and callers that must cover both will compose this with a second
 * registry rather than this class growing a database dependency.
 *
 * Takes its definitions as a constructor argument instead of importing the generated file
 * directly. That keeps it a plain, trivially testable object — a test builds two definitions and
 * asserts behaviour without touching the real catalog — and leaves the composition root as the one
 * place that decides which definitions are in play.
 */
export class StaticGameRegistry implements GameRegistry {
  private readonly bySlug: Map<string, GameDefinition>;
  private readonly ordered: readonly GameDefinition[];

  constructor(definitions: readonly GameDefinition[]) {
    // A duplicate slug here would mean one game silently shadowing another. The build already
    // rejects that (scripts/registry-builder.ts's assertUniqueSlugs), so reaching this throw means
    // a caller assembled the list by hand and got it wrong — worth failing loudly at construction
    // rather than serving whichever entry happened to be last.
    this.bySlug = new Map();
    for (const definition of definitions) {
      if (this.bySlug.has(definition.slug)) {
        throw new Error(`Duplicate game slug in registry: ${definition.slug}`);
      }
      this.bySlug.set(definition.slug, definition);
    }
    this.ordered = [...definitions];
  }

  findBySlug(slug: string): Promise<GameDefinition | null> {
    return Promise.resolve(this.bySlug.get(slug) ?? null);
  }

  listAll(): Promise<readonly GameDefinition[]> {
    return Promise.resolve(this.ordered);
  }
}
