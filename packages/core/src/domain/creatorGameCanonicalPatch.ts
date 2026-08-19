/**
 * Stage C-2 of the Creator B2 Canonical Registry migration — the pure logic behind patching an
 * EXISTING B2 canonical document from an admin metadata PATCH
 * (`SandboxGameMetadataInput`/`SandboxGameMetadataUpdateRequestSchema`). No I/O, no B2/D1 client —
 * see application/sandboxGameUseCases.ts's `updateMetadata` for the orchestration (read existing
 * canonical, validate, D1 update, then call {@link patchCreatorCanonicalDocument} and save/
 * parity-check the result) and application/creatorCanonicalBackfill.ts for the separate, unrelated
 * "no canonical yet at all" backfill path this file does not replace.
 *
 * The one rule everything below exists to enforce: patching NEVER rebuilds the document from
 * scratch via `mapSandboxGameRecordToCanonical(updatedRow)`. That mapper is only ever correct for
 * the *first* canonicalization of a row that has no B2 document yet (see that function's own doc
 * comment) — calling it again on a row that already has a real canonical document would silently
 * overwrite or drop whatever B2-only state exists there (`presentation`, `policy.requiresAuth`,
 * `policy.leaderboard`, an explicit `policy.score: null`) with D1's own duplicate/defaulted
 * values, none of which D1 even has a column for in some cases (there is no `sandbox_games`
 * column for `presentation` or `requiresAuth` at all). {@link patchCreatorCanonicalDocument} only
 * ever changes the fields `input` actually named; everything else — including the *entire*
 * document, when `input` names nothing this file reads — carries over from `existing` untouched.
 *
 * This same rule applies field-by-field to `policy.score`, not just to the document as a whole:
 * {@link computeCreatorCanonicalScorePatch} never reads D1 at all (no `SandboxGameRecord` — the
 * function only takes `existingScore` and `input`). D1 and B2 can genuinely diverge for
 * `score_*` columns the metadata API doesn't touch every time (D1 is a migration-period
 * compatibility mirror, not a re-derivation source for an already-canonical field) — a PATCH that
 * only names `scoreMax` must leave B2's own `unit`/`direction`/`min`/`displayPrefix`/
 * `displaySuffix` exactly as they were, never "helpfully" refreshed from whatever D1 currently
 * happens to hold for those columns.
 */

import type { ScoreConfig } from "@owogg/game-sdk/contracts";
import type { CreatorGameCanonicalDocument } from "./creatorGameCanonicalDocument.js";
import { isCreatorScorePolicyConfigured } from "./creatorScorePolicy.js";
import type { SandboxGameMetadataInput, SandboxGameRecord } from "../ports/sandboxGames.js";

export const CREATOR_CANONICAL_SCORE_PATCH_REJECTIONS = [
  "SCORE_POLICY_WOULD_BECOME_INCOMPLETE",
  "AMBIGUOUS_SCORE_POLICY_ACTIVATION",
] as const;
export type CreatorCanonicalScorePatchRejection =
  (typeof CREATOR_CANONICAL_SCORE_PATCH_REJECTIONS)[number];

export type CreatorCanonicalScorePatchResult =
  | { readonly ok: true; readonly score: ScoreConfig | null }
  | { readonly ok: false; readonly reason: CreatorCanonicalScorePatchRejection };

function touchesAnyScoreField(input: SandboxGameMetadataInput): boolean {
  return (
    input.scoreUnit !== undefined ||
    input.scoreDirection !== undefined ||
    input.scoreMin !== undefined ||
    input.scoreMax !== undefined ||
    input.scoreDisplayPrefix !== undefined ||
    input.scoreDisplaySuffix !== undefined
  );
}

function buildScoreConfig(fields: {
  unit: string;
  direction: "asc" | "desc";
  min: number;
  max: number;
  displayPrefix: string | null;
  displaySuffix: string | null;
}): ScoreConfig {
  return {
    unit: fields.unit,
    direction: fields.direction,
    min: fields.min,
    max: fields.max,
    ...(fields.displayPrefix ? { displayPrefix: fields.displayPrefix } : {}),
    ...(fields.displaySuffix ? { displaySuffix: fields.displaySuffix } : {}),
  };
}

/**
 * Decides what an existing canonical document's `policy.score` becomes after a metadata PATCH —
 * `score: null` (deliberately unscored) and an incomplete/not-yet-configured score policy are
 * never conflated (see domain/creatorScorePolicy.ts's own doc comment on why that distinction
 * matters). Deliberately takes no D1 row at all — see this file's own top doc comment on why B2
 * must stay the sole source of truth for every field this function doesn't explicitly patch.
 *
 * Two cases:
 *
 *   1. `existingScore` is a real `ScoreConfig` — the BASE is always `existingScore` itself, never
 *      anything derived from D1. Only the fields `input` explicitly names are overridden (using
 *      `input`'s own value, which is exactly the row's post-update value too, since D1 applies
 *      score_* columns verbatim with no normalization — see D1SandboxGameRepository's own
 *      `buildMetadataAssignments`). If the patch doesn't touch any score field at all, the result
 *      is `existingScore` unchanged. If overriding leaves any of the four required fields null,
 *      the whole patch is rejected (`SCORE_POLICY_WOULD_BECOME_INCOMPLETE`) — never reinterpreted
 *      as "switch to score: null" (Stage C-2 does not support a ScoreConfig -> null transition;
 *      no such intent exists anywhere in the current metadata API).
 *   2. `existingScore` is `null` (deliberately unscored): a patch that touches no score field
 *      leaves it `null`. A patch that touches ANY score field must supply all four required
 *      fields as explicit, non-null values IN THIS REQUEST ITSELF — never inferred from D1's own
 *      possibly-stale leftover score_* columns (there is nothing to fall back to here at all;
 *      this branch never reads anything but `input`) — anything less is rejected as
 *      `AMBIGUOUS_SCORE_POLICY_ACTIVATION`. The optional `scoreDisplayPrefix`/`scoreDisplaySuffix`
 *      are included ONLY when `input` itself names them — a stale D1 display value left over from
 *      before the game went unscored must never leak into the newly-activated `ScoreConfig`.
 */
export function computeCreatorCanonicalScorePatch(
  existingScore: ScoreConfig | null,
  input: SandboxGameMetadataInput,
): CreatorCanonicalScorePatchResult {
  const touched = touchesAnyScoreField(input);

  if (existingScore !== null) {
    if (!touched) {
      return { ok: true, score: existingScore };
    }

    const merged = {
      scoreUnit: input.scoreUnit !== undefined ? input.scoreUnit : existingScore.unit,
      scoreDirection:
        input.scoreDirection !== undefined ? input.scoreDirection : existingScore.direction,
      scoreMin: input.scoreMin !== undefined ? input.scoreMin : existingScore.min,
      scoreMax: input.scoreMax !== undefined ? input.scoreMax : existingScore.max,
    };
    if (!isCreatorScorePolicyConfigured(merged)) {
      return { ok: false, reason: "SCORE_POLICY_WOULD_BECOME_INCOMPLETE" };
    }

    const displayPrefix =
      input.scoreDisplayPrefix !== undefined
        ? input.scoreDisplayPrefix
        : (existingScore.displayPrefix ?? null);
    const displaySuffix =
      input.scoreDisplaySuffix !== undefined
        ? input.scoreDisplaySuffix
        : (existingScore.displaySuffix ?? null);

    return {
      ok: true,
      score: buildScoreConfig({
        unit: merged.scoreUnit,
        direction: merged.scoreDirection,
        min: merged.scoreMin,
        max: merged.scoreMax,
        displayPrefix,
        displaySuffix,
      }),
    };
  }

  if (!touched) {
    return { ok: true, score: null };
  }

  const explicitlyProvided = {
    scoreUnit: input.scoreUnit ?? null,
    scoreDirection: input.scoreDirection ?? null,
    scoreMin: input.scoreMin ?? null,
    scoreMax: input.scoreMax ?? null,
  };
  if (!isCreatorScorePolicyConfigured(explicitlyProvided)) {
    return { ok: false, reason: "AMBIGUOUS_SCORE_POLICY_ACTIVATION" };
  }

  return {
    ok: true,
    score: buildScoreConfig({
      unit: explicitlyProvided.scoreUnit,
      direction: explicitlyProvided.scoreDirection,
      min: explicitlyProvided.scoreMin,
      max: explicitlyProvided.scoreMax,
      displayPrefix: input.scoreDisplayPrefix ?? null,
      displaySuffix: input.scoreDisplaySuffix ?? null,
    }),
  };
}

export type CreatorCanonicalPatchResult =
  | { readonly ok: true; readonly document: CreatorGameCanonicalDocument }
  | { readonly ok: false; readonly reason: CreatorCanonicalScorePatchRejection };

/**
 * Applies one admin metadata PATCH onto an EXISTING canonical document — see this file's own top
 * doc comment for why this never rebuilds the document from `mapSandboxGameRecordToCanonical`.
 *
 * `updatedRow` must be the D1 row AFTER `SandboxGameRepository.updateMetadata` has already applied
 * `input` — used here only for `title`/`shortDescription`/`description`/`genre`/`xpPerCompletion`/
 * `updatedAt` (D1's own compatibility-mirror fields); `policy.score` is computed by
 * {@link computeCreatorCanonicalScorePatch} from `input` alone, which never reads `updatedRow` at
 * all (see that function's own doc comment on why B2 — never D1 — is `policy.score`'s base).
 * `updatedAt` is the single timestamp this document's own `updatedAt` reuses verbatim (never a
 * second, independently-generated one — see sandboxGameUseCases.ts's own doc comment on why
 * `new Date()` is only ever called once per mutation).
 *
 * Always preserved from `existing`, regardless of what `input` contains: `schemaVersion`, `slug`,
 * `mode` (the metadata API has no field to change it), `presentation`, `policy.requiresAuth`,
 * `policy.leaderboard`. `title`/`shortDescription`/`description`/`genre`/`policy.xpPerCompletion`
 * change only when `input` names them; `shortDescription`/`description` reuse the same
 * null-to-empty-string convention `mapSandboxGameRecordToCanonical` already established for D1's
 * nullable columns.
 */
export function patchCreatorCanonicalDocument(
  existing: CreatorGameCanonicalDocument,
  updatedRow: Pick<
    SandboxGameRecord,
    "title" | "shortDescription" | "description" | "genre" | "xpPerCompletion" | "updatedAt"
  >,
  input: SandboxGameMetadataInput,
): CreatorCanonicalPatchResult {
  const scoreResult = computeCreatorCanonicalScorePatch(existing.policy.score, input);
  if (!scoreResult.ok) {
    return scoreResult;
  }

  const document: CreatorGameCanonicalDocument = {
    ...existing,
    title: input.title !== undefined ? updatedRow.title : existing.title,
    shortDescription:
      input.shortDescription !== undefined
        ? (updatedRow.shortDescription ?? "")
        : existing.shortDescription,
    description:
      input.description !== undefined ? (updatedRow.description ?? "") : existing.description,
    genre: input.genre !== undefined ? updatedRow.genre : existing.genre,
    policy: {
      ...existing.policy,
      score: scoreResult.score,
      xpPerCompletion:
        input.xpPerCompletion !== undefined
          ? updatedRow.xpPerCompletion
          : existing.policy.xpPerCompletion,
    },
    updatedAt: updatedRow.updatedAt,
  };

  return { ok: true, document };
}
