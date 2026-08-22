/**
 * Pure conversion of the repository's official game definition into the provider-neutral
 * canonical document used by official generic bootstrap. USER games already write that document
 * directly through the control plane and need no intermediate conversion.
 */

import {
  GAME_CANONICAL_SCHEMA_VERSION,
  type GameCanonicalDocument,
} from "./gameCanonicalDocument.js";
import type { SystemGameDefinition } from "./gameDefinition.js";
/**
 * `SystemGameDefinition` (modules/game/domain/gameDefinition.ts) → {@link GameCanonicalDocument},
 * lossless: `title`/`shortDescription`/`description`/`policy`/`presentation`/`difficulty`/
 * `supportsReplay` carry over verbatim; `categories`/`tags`/`modes`/`inputMethods`/`minPlayers`/
 * `maxPlayers`/`thumbnail`/`accent`/`estimatedRoundSeconds` become a `TAXONOMY` catalog.
 * `definition.status` is deliberately NEVER read here — see gameCanonicalDocument.ts's own top
 * doc comment on why `status` stays a D1/runtime concept this schema doesn't carry.
 *
 * `updatedAt` is a required caller-supplied argument, not generated inside this function — a
 * `SystemGameDefinition` has no timestamp of its own, so silently calling `new Date()` here would
 * hide exactly when/why a converted
 * document's provenance timestamp was actually set. A future caller (a real migration Stage) must
 * decide and state that source explicitly.
 */
export function systemGameDefinitionToGameCanonicalDocument(
  definition: SystemGameDefinition,
  updatedAt: string,
): GameCanonicalDocument {
  return {
    schemaVersion: GAME_CANONICAL_SCHEMA_VERSION,
    slug: definition.slug,
    title: definition.title,
    shortDescription: definition.shortDescription,
    description: definition.description,
    publisher: { official: true },
    policy: definition.policy,
    ...(definition.presentation !== undefined ? { presentation: definition.presentation } : {}),
    ...(definition.difficulty !== undefined ? { difficulty: definition.difficulty } : {}),
    supportsReplay: definition.supportsReplay,
    catalog: {
      type: "TAXONOMY",
      categories: definition.categories,
      tags: definition.tags,
      modes: definition.modes,
      inputMethods: definition.inputMethods,
      minPlayers: definition.minPlayers,
      maxPlayers: definition.maxPlayers,
      thumbnail: definition.thumbnail,
      ...(definition.accent !== undefined ? { accent: definition.accent } : {}),
      ...(definition.estimatedRoundSeconds !== undefined
        ? { estimatedRoundSeconds: definition.estimatedRoundSeconds }
        : {}),
    },
    updatedAt,
  };
}
