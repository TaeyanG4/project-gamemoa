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
 */

import type { ScoreConfig } from "@owogg/game-sdk/contracts";
import type { CreatorGameCanonicalDocument } from "./creatorGameCanonicalDocument.js";
import { isCreatorScorePolicyConfigured } from "./creatorScorePolicy.js";
import type { SandboxGameMetadataInput, SandboxGameRecord } from "../ports/sandboxGames.js";

/** The score_* fields a patch decision reads — from either a real `SandboxGameRecord` (the D1 row
 * already reflects `input` once `SandboxGameRepository.updateMetadata` has run) or a simulated
 * pre-mutation merge (see `mergeEffectiveScoreFields` in sandboxGameUseCases.ts, used to validate
 * BEFORE the D1 write actually happens). */
export type EffectiveScoreFields = Pick<
  SandboxGameRecord,
  | "scoreUnit"
  | "scoreDirection"
  | "scoreMin"
  | "scoreMax"
  | "scoreDisplayPrefix"
  | "scoreDisplaySuffix"
>;

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

function buildScoreConfig(effective: EffectiveScoreFields): ScoreConfig {
  // Only reachable once the caller has already confirmed (via isCreatorScorePolicyConfigured)
  // that the four required fields are non-null — the `as` casts below just spell that out for
  // TypeScript at the one call site that needs it, not a new, unchecked assumption.
  return {
    unit: effective.scoreUnit as string,
    direction: effective.scoreDirection as "asc" | "desc",
    min: effective.scoreMin as number,
    max: effective.scoreMax as number,
    ...(effective.scoreDisplayPrefix ? { displayPrefix: effective.scoreDisplayPrefix } : {}),
    ...(effective.scoreDisplaySuffix ? { displaySuffix: effective.scoreDisplaySuffix } : {}),
  };
}

/**
 * Decides what an existing canonical document's `policy.score` becomes after a metadata PATCH —
 * `score: null` (deliberately unscored) and an incomplete/not-yet-configured score policy are
 * never conflated (see domain/creatorScorePolicy.ts's own doc comment on why that distinction
 * matters). Three cases:
 *
 *   1. `existingScore` is a real `ScoreConfig`, and the patch doesn't touch any score field at
 *      all → unchanged, still that same `ScoreConfig`.
 *   2. `existingScore` is a real `ScoreConfig`, and the patch DOES touch a score field, but the
 *      resulting `effective` fields (this request's patch merged onto the current row — see
 *      `EffectiveScoreFields`'s own doc comment) leave any of the four required fields null →
 *      rejected (`SCORE_POLICY_WOULD_BECOME_INCOMPLETE`). This function never interprets that as
 *      "switch to score: null" — Stage C-2 does not support a ScoreConfig -> null transition (no
 *      "make this deliberately unscored" intent exists anywhere in the current metadata API).
 *   3. `existingScore` is `null` (deliberately unscored): a patch that touches no score field
 *      leaves it `null`. A patch that touches ANY score field must supply all four required
 *      fields as explicit, non-null values IN THIS REQUEST ITSELF (never inferred from
 *      `effective`/D1's own possibly-stale leftover score_* columns) — anything less is rejected
 *      as `AMBIGUOUS_SCORE_POLICY_ACTIVATION`, not silently treated as "still unscored" or
 *      "partially scored".
 */
export function computeCreatorCanonicalScorePatch(
  existingScore: ScoreConfig | null,
  effective: EffectiveScoreFields,
  input: SandboxGameMetadataInput,
): CreatorCanonicalScorePatchResult {
  const touched = touchesAnyScoreField(input);

  if (existingScore !== null) {
    if (!touched) {
      return { ok: true, score: existingScore };
    }
    if (!isCreatorScorePolicyConfigured(effective)) {
      return { ok: false, reason: "SCORE_POLICY_WOULD_BECOME_INCOMPLETE" };
    }
    return { ok: true, score: buildScoreConfig(effective) };
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
  return { ok: true, score: buildScoreConfig(effective) };
}

export type CreatorCanonicalPatchResult =
  | { readonly ok: true; readonly document: CreatorGameCanonicalDocument }
  | { readonly ok: false; readonly reason: CreatorCanonicalScorePatchRejection };

/**
 * Applies one admin metadata PATCH onto an EXISTING canonical document — see this file's own top
 * doc comment for why this never rebuilds the document from `mapSandboxGameRecordToCanonical`.
 *
 * `updatedRow` must be the D1 row AFTER `SandboxGameRepository.updateMetadata` has already applied
 * `input` — its score_* columns are therefore already the real "effective" (patch-merged) values,
 * and its `updatedAt` is the single timestamp this document's own `updatedAt` reuses verbatim
 * (never a second, independently-generated one — see sandboxGameUseCases.ts's own doc comment on
 * why `new Date()` is only ever called once per mutation).
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
    | "title"
    | "shortDescription"
    | "description"
    | "genre"
    | "xpPerCompletion"
    | "scoreUnit"
    | "scoreDirection"
    | "scoreMin"
    | "scoreMax"
    | "scoreDisplayPrefix"
    | "scoreDisplaySuffix"
    | "updatedAt"
  >,
  input: SandboxGameMetadataInput,
): CreatorCanonicalPatchResult {
  const scoreResult = computeCreatorCanonicalScorePatch(existing.policy.score, updatedRow, input);
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
