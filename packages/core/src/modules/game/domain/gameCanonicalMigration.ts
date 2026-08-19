/**
 * Unified Game Platform, Stage U-1 — pure, lossless converters from today's two existing canonical
 * shapes into the new generic {@link GameCanonicalDocument}. No I/O, nothing wired to any adapter
 * or route — these exist only so a future migration Stage has a tested, correct starting point;
 * nothing calls them yet.
 */

import type { CreatorGameCanonicalDocument } from "../../../domain/creatorGameCanonicalDocument.js";
import {
  GAME_CANONICAL_SCHEMA_VERSION,
  type GameCanonicalDocument,
} from "./gameCanonicalDocument.js";
import type { SystemGameDefinition } from "./gameDefinition.js";

/**
 * `CreatorGameCanonicalDocument` (domain/creatorGameCanonicalDocument.ts, Stage A) →
 * {@link GameCanonicalDocument}, lossless: `title`/`shortDescription`/`description`/`policy`/
 * `presentation`/`updatedAt` carry over verbatim (including an explicit `policy.score: null` and
 * every decimal score bound — neither is touched), `genre`/`mode` become a `GENRE_MODE` catalog.
 * `difficulty` is omitted (Creator's canonical schema has no such field to lose — see that
 * document's own doc comment). `supportsReplay` is set to the same `false` this migration's own
 * Creator platform fact already is everywhere else it's asserted (registry/creatorGameRegistry.ts's
 * `projectCreatorGameDefinition`) — not a fabricated default, a restated one.
 */
export function creatorCanonicalDocumentToGameCanonicalDocument(
  document: CreatorGameCanonicalDocument,
): GameCanonicalDocument {
  return {
    schemaVersion: GAME_CANONICAL_SCHEMA_VERSION,
    slug: document.slug,
    title: document.title,
    shortDescription: document.shortDescription,
    description: document.description,
    policy: document.policy,
    ...(document.presentation !== undefined ? { presentation: document.presentation } : {}),
    supportsReplay: false,
    catalog: { type: "GENRE_MODE", genre: document.genre, mode: document.mode },
    updatedAt: document.updatedAt,
  };
}

/**
 * `SystemGameDefinition` (modules/game/domain/gameDefinition.ts) → {@link GameCanonicalDocument},
 * lossless: `title`/`shortDescription`/`description`/`policy`/`presentation`/`difficulty`/
 * `supportsReplay` carry over verbatim; `categories`/`tags`/`modes`/`inputMethods`/`minPlayers`/
 * `maxPlayers`/`thumbnail`/`accent`/`estimatedRoundSeconds` become a `TAXONOMY` catalog.
 * `definition.status` is deliberately NEVER read here — see gameCanonicalDocument.ts's own top
 * doc comment on why `status` stays a D1/runtime concept this schema doesn't carry.
 *
 * `updatedAt` is a required caller-supplied argument, not generated inside this function — a
 * `SystemGameDefinition` has no timestamp of its own (game-registry/'s JSON files aren't
 * timestamped), so silently calling `new Date()` here would hide exactly when/why a converted
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
