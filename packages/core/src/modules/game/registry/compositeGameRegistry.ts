/**
 * Stage C-3 of the Creator B2 Canonical Registry migration — a {@link GameRegistry} that unifies a
 * SYSTEM registry and a CREATOR registry into one owner-agnostic read surface. Depends only on the
 * {@link GameRegistry} port twice, never a concrete implementation — the composition root decides
 * what "SYSTEM" and "CREATOR" actually are (`StaticGameRegistry(GAME_DEFINITIONS)` and
 * `CreatorGameRegistry`, respectively, in production — see apps/api/src/container.ts).
 *
 * SYSTEM always wins a same-slug collision, and always resolves without ever touching the CREATOR
 * registry at all:
 *
 *   - `findBySlug`: checks `systemRegistry` first: a hit returns immediately, without calling
 *     `creatorRegistry.findBySlug` at all — a SYSTEM lookup never has to pay for (or risk failing
 *     because of) a Creator D1/B2 round trip it doesn't need. Only a SYSTEM miss falls through to
 *     `creatorRegistry.findBySlug`.
 *   - `listAll`: every SYSTEM definition first (in `systemRegistry`'s own order), then every
 *     CREATOR definition whose slug doesn't collide with a SYSTEM one (in `creatorRegistry`'s own
 *     order) — the same "SYSTEM identity can never be shadowed" policy `resolvePublicGame`
 *     (domain/publicGame.ts) already documents for the public read model, applied here one layer
 *     lower. Neither half is re-sorted; the combined list is never alphabetized.
 *
 * Never swallows a CREATOR-side failure to produce a partial, SYSTEM-only-looking result — a
 * `CreatorGameRegistryError` (`CANONICAL_MISSING` or otherwise) or a storage/malformed-document
 * error from `creatorRegistry` propagates exactly as thrown, in both `findBySlug` (once a SYSTEM
 * miss has already happened) and `listAll` (the whole call fails, not just the CREATOR half of the
 * result) — same "no silent partial registry" posture `CreatorGameRegistry` itself already
 * documents for its own D1/B2 combination, extended here to the composite as a whole.
 */

import type { GameDefinition } from "../domain/gameDefinition.js";
import type { GameRegistry } from "../ports/gameRegistry.js";

export class CompositeGameRegistry implements GameRegistry {
  constructor(
    private readonly systemRegistry: GameRegistry,
    private readonly creatorRegistry: GameRegistry,
  ) {}

  async findBySlug(slug: string): Promise<GameDefinition | null> {
    const systemDefinition = await this.systemRegistry.findBySlug(slug);
    if (systemDefinition !== null) {
      return systemDefinition;
    }
    return this.creatorRegistry.findBySlug(slug);
  }

  async listAll(): Promise<readonly GameDefinition[]> {
    const [systemDefinitions, creatorDefinitions] = await Promise.all([
      this.systemRegistry.listAll(),
      this.creatorRegistry.listAll(),
    ]);

    const systemSlugs = new Set(systemDefinitions.map((d) => d.slug));
    const nonCollidingCreatorDefinitions = creatorDefinitions.filter(
      (d) => !systemSlugs.has(d.slug),
    );

    return [...systemDefinitions, ...nonCollidingCreatorDefinitions];
  }
}
