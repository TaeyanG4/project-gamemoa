/**
 * Stage B-1 of the Creator B2 Canonical Registry migration — a pure, provider-neutral mapper from
 * `SandboxGameRecord` (D1's own row shape, ports/sandboxGames.ts) to
 * `CreatorGameCanonicalDocument` (domain/creatorGameCanonicalDocument.ts). No B2, no D1 client, no
 * write anywhere — this PR only builds the mapping function itself; nothing calls it yet (no
 * backfill, no dual-read, no GameRegistry wiring — that's a later Stage).
 *
 * Only reads the fields {@link SandboxGameRecordCanonicalSource} lists — never the full
 * `SandboxGameRecord` — so the type signature itself proves this can't accidentally read (and
 * therefore can't leak) `id`, `developerUserId`, `visibility`, `liveVersionId`, `reviewSlot`,
 * `deletedAt`/`deletedByAdminId`, or `logoKey`: every one of those is D1 runtime/relational state
 * that domain/creatorGameCanonicalDocument.ts's own top doc comment already excludes from the
 * canonical document, for the same reasons that apply there.
 */

import {
  CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
  type CreatorGameCanonicalDocument,
} from "./creatorGameCanonicalDocument.js";
import { isCreatorScorePolicyConfigured } from "./creatorScorePolicy.js";
import type { SandboxGameRecord } from "../ports/sandboxGames.js";

/** Exactly the fields this mapper reads — see this file's own top doc comment for why this is a
 * `Pick`, not the full `SandboxGameRecord`. */
export type SandboxGameRecordCanonicalSource = Pick<
  SandboxGameRecord,
  | "slug"
  | "title"
  | "shortDescription"
  | "description"
  | "genre"
  | "mode"
  | "xpPerCompletion"
  | "scoreUnit"
  | "scoreDirection"
  | "scoreMin"
  | "scoreMax"
  | "scoreDisplayPrefix"
  | "scoreDisplaySuffix"
  | "updatedAt"
>;

/**
 * The one case this mapper refuses to guess at, rather than silently producing a document that
 * misrepresents the game: a `SandboxGameRecord` whose score_* columns are only *partially* set
 * (some, but not all, of scoreUnit/scoreDirection/scoreMin/scoreMax non-null) — or, just as
 * importantly, entirely unset. `domain/creatorScorePolicy.ts`'s own
 * `isCreatorScorePolicyConfigured` (the shared "any column null -> incomplete" gate this mapper,
 * `sandboxGameToScorePolicy`, and `CreatorGameRegistry`'s own pre-canonical classification all
 * call, rather than each re-declaring it) already documents why: for a Creator game, unlike a
 * SYSTEM manifest, "no score
 * columns set yet" and "deliberately unscored" are NOT distinguishable from D1 alone — there is
 * no separate "this game is intentionally unscored" flag anywhere in `sandbox_games`. Collapsing
 * that into `score: null` (this document's spelling of "deliberately unscored") would silently
 * claim a game an admin simply hasn't gotten to yet is unscored on purpose — a wrong canonical
 * fact, not a missing one. So this mapper does not produce a document for that row at all; the
 * caller gets an explicit `{ ok: false }` instead. See {@link mapSandboxGameRecordToCanonical}'s
 * own doc comment for the full mapping rules, including why `leaderboard`/`requiresAuth` don't
 * have this same ambiguity.
 */
export type CreatorCanonicalMappingBlockReason = "SCORE_POLICY_NOT_CONFIGURED";

export type CreatorCanonicalMappingResult =
  | { readonly ok: true; readonly document: CreatorGameCanonicalDocument }
  | { readonly ok: false; readonly reason: CreatorCanonicalMappingBlockReason };

/**
 * Maps one `SandboxGameRecord` (or the subset of it {@link SandboxGameRecordCanonicalSource}
 * names) to a `CreatorGameCanonicalDocument`, or explicitly refuses to when the row's score
 * policy is incomplete (see {@link CreatorCanonicalMappingBlockReason}'s own doc comment) —
 * deterministic and side-effect-free: the same input always produces the same output, and nothing
 * here reads the clock, generates an id, or touches any I/O.
 *
 * Field-by-field:
 *   - `slug`/`title`/`genre`/`mode` pass through as-is — already non-nullable, required columns.
 *   - `shortDescription`/`description`: `?? ""` — the same null-to-empty-string projection
 *     `apps/web/app/features/catalog/sandboxGameAdapter.ts` already applies when turning this
 *     same nullable D1 pair into a non-nullable catalog-facing string, reused here rather than
 *     inventing a second convention for the same nullable-D1-string-to-canonical-string gap.
 *   - `policy.score`: built from scoreUnit/scoreDirection/scoreMin/scoreMax/scoreDisplayPrefix/
 *     scoreDisplaySuffix — identical shape to `sandboxGameToScorePolicy`'s own `score` object,
 *     reached only once every required column has already been confirmed non-null above.
 *   - `policy.leaderboard`: always `true` in the `{ ok: true }` branch — derived from "does this
 *     game have a complete score policy", not invented: this is the exact rule
 *     `packages/core/src/application/creatorLeaderboardUseCases.ts` already enforces as this
 *     game's REAL leaderboard availability today (a complete score policy is one of its two
 *     gates — the other, PUBLIC + live version, is D1 runtime state that correctly stays out of
 *     this document), and it's the same invariant `scripts/game-registry-schema.ts` enforces for
 *     SYSTEM games ("leaderboard: true requires score !== null — there would be nothing to
 *     rank"). Written as an explicit derivation rather than a bare `true` literal so a future
 *     change to this mapper's blocking condition can't silently stop being backed by that rule.
 *   - `policy.xpPerCompletion`: passed through as-is — a real, already-admin-set D1 column (see
 *     `SandboxGameMetadataInput`), unlike `sandboxGameToScorePolicy`'s own hardcoded `0` (that
 *     adapter zeroes it deliberately for an unrelated reason — see its own doc comment on why XP
 *     isn't connected to Creator score submission yet — which has nothing to do with what this
 *     canonical document should record as the game's own configured policy value).
 *   - `policy.requiresAuth`: always `false` — not row data (no such column exists on
 *     `sandbox_games`), but a verified, currently-uniform platform fact about the field's ACTUAL
 *     meaning. `GamePolicy.requiresAuth` (gameDefinition.ts's own doc comment) is "whether a
 *     player must be signed in to PLAY at all" — a distinct concern from score-*submission*
 *     authentication, which `CreatorScoreAcceptanceUseCases.accept` requiring a session's `userId`
 *     is actually about, and has no bearing on this field. The real, current answer to "must a
 *     player sign in to play a Creator game" is no: `CreatorGameHost` never gates play on
 *     `isAuthenticated` (guest play is the default, matching every other unauthenticated-visitor
 *     surface), and `toPublicCreatorGame` (domain/publicGame.ts) already hardcodes
 *     `requiresAuth: false` on the exact same reasoning for the read model this mapper's
 *     canonical document is meant to eventually replace the D1 half of. Written as an explicit
 *     constant with this comment, not silently inlined, so it's visible and searchable the moment
 *     Creator games gain a real per-game play-gate and this stops being uniformly false.
 *   - `presentation`: omitted entirely — Creator Presentation wiring hasn't happened yet (see
 *     domain/creatorGameCanonicalDocument.ts's own doc comment); there is nothing to map from.
 *   - `updatedAt`: the D1 row's own `updatedAt` — never `new Date()`. This document's own
 *     provenance timestamp is "when did the source row last change", not "when did this mapper
 *     run".
 */
export function mapSandboxGameRecordToCanonical(
  record: SandboxGameRecordCanonicalSource,
): CreatorCanonicalMappingResult {
  if (!isCreatorScorePolicyConfigured(record)) {
    return { ok: false, reason: "SCORE_POLICY_NOT_CONFIGURED" };
  }

  const document: CreatorGameCanonicalDocument = {
    schemaVersion: CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
    slug: record.slug,
    title: record.title,
    shortDescription: record.shortDescription ?? "",
    description: record.description ?? "",
    genre: record.genre,
    mode: record.mode,
    policy: {
      score: {
        unit: record.scoreUnit,
        direction: record.scoreDirection,
        min: record.scoreMin,
        max: record.scoreMax,
        ...(record.scoreDisplayPrefix ? { displayPrefix: record.scoreDisplayPrefix } : {}),
        ...(record.scoreDisplaySuffix ? { displaySuffix: record.scoreDisplaySuffix } : {}),
      },
      leaderboard: true,
      xpPerCompletion: record.xpPerCompletion,
      // Guest play is the current, real Creator platform behavior — see this function's own
      // doc comment for why this is `false`, not `true`.
      requiresAuth: false,
    },
    updatedAt: record.updatedAt,
  };

  return { ok: true, document };
}
