import type { ScoreConfig } from "@owogg/game-sdk/contracts";
import type { SandboxGameMetadataInput, SandboxGameRecord } from "../ports/sandboxGames.js";
import { isCreatorScorePolicyConfigured } from "./creatorScorePolicy.js";
import {
  GAME_CANONICAL_SCHEMA_VERSION,
  type GameCanonicalDocument,
} from "../modules/game/domain/gameCanonicalDocument.js";

export type UserCanonicalPatchRejection =
  | "SCORE_POLICY_WOULD_BECOME_INCOMPLETE"
  | "AMBIGUOUS_SCORE_POLICY_ACTIVATION"
  | "CATALOG_SHAPE_NOT_EDITABLE";

type UserCanonicalScorePatchRejection = Exclude<
  UserCanonicalPatchRejection,
  "CATALOG_SHAPE_NOT_EDITABLE"
>;

export type UserCanonicalPatchResult =
  | { readonly ok: true; readonly document: GameCanonicalDocument }
  | { readonly ok: false; readonly reason: UserCanonicalPatchRejection };

type ScorePatchResult =
  | { readonly ok: true; readonly score: ScoreConfig | null }
  | { readonly ok: false; readonly reason: UserCanonicalScorePatchRejection };

function touchesScore(input: SandboxGameMetadataInput): boolean {
  return (
    input.scoreUnit !== undefined ||
    input.scoreDirection !== undefined ||
    input.scoreMin !== undefined ||
    input.scoreMax !== undefined ||
    input.scoreDisplayPrefix !== undefined ||
    input.scoreDisplaySuffix !== undefined
  );
}

function scoreConfig(input: {
  unit: string;
  direction: "asc" | "desc";
  min: number;
  max: number;
  displayPrefix: string | null;
  displaySuffix: string | null;
}): ScoreConfig {
  return {
    unit: input.unit,
    direction: input.direction,
    min: input.min,
    max: input.max,
    ...(input.displayPrefix ? { displayPrefix: input.displayPrefix } : {}),
    ...(input.displaySuffix ? { displaySuffix: input.displaySuffix } : {}),
  };
}

/** Computes a score patch from generic canonical state alone. D1 is never used as a fallback. */
export function computeUserCanonicalScorePatch(
  existing: ScoreConfig | null,
  input: SandboxGameMetadataInput,
): ScorePatchResult {
  if (existing !== null) {
    if (!touchesScore(input)) return { ok: true, score: existing };

    const required = {
      scoreUnit: input.scoreUnit !== undefined ? input.scoreUnit : existing.unit,
      scoreDirection:
        input.scoreDirection !== undefined ? input.scoreDirection : existing.direction,
      scoreMin: input.scoreMin !== undefined ? input.scoreMin : existing.min,
      scoreMax: input.scoreMax !== undefined ? input.scoreMax : existing.max,
    };
    if (!isCreatorScorePolicyConfigured(required)) {
      return { ok: false, reason: "SCORE_POLICY_WOULD_BECOME_INCOMPLETE" };
    }
    return {
      ok: true,
      score: scoreConfig({
        unit: required.scoreUnit,
        direction: required.scoreDirection,
        min: required.scoreMin,
        max: required.scoreMax,
        displayPrefix:
          input.scoreDisplayPrefix !== undefined
            ? input.scoreDisplayPrefix
            : (existing.displayPrefix ?? null),
        displaySuffix:
          input.scoreDisplaySuffix !== undefined
            ? input.scoreDisplaySuffix
            : (existing.displaySuffix ?? null),
      }),
    };
  }

  if (!touchesScore(input)) return { ok: true, score: null };
  const required = {
    scoreUnit: input.scoreUnit ?? null,
    scoreDirection: input.scoreDirection ?? null,
    scoreMin: input.scoreMin ?? null,
    scoreMax: input.scoreMax ?? null,
  };
  if (!isCreatorScorePolicyConfigured(required)) {
    return { ok: false, reason: "AMBIGUOUS_SCORE_POLICY_ACTIVATION" };
  }
  return {
    ok: true,
    score: scoreConfig({
      unit: required.scoreUnit,
      direction: required.scoreDirection,
      min: required.scoreMin,
      max: required.scoreMax,
      displayPrefix: input.scoreDisplayPrefix ?? null,
      displaySuffix: input.scoreDisplaySuffix ?? null,
    }),
  };
}

/** Patches an existing generic canonical without rebuilding fields absent from D1. */
export function patchUserGameCanonical(
  existing: GameCanonicalDocument,
  updated: Pick<
    SandboxGameRecord,
    "title" | "shortDescription" | "description" | "genre" | "xpPerCompletion" | "updatedAt"
  >,
  input: SandboxGameMetadataInput,
): UserCanonicalPatchResult {
  const score = computeUserCanonicalScorePatch(existing.policy.score, input);
  if (!score.ok) return score;
  if (input.genre !== undefined && existing.catalog.type !== "GENRE_MODE") {
    return { ok: false, reason: "CATALOG_SHAPE_NOT_EDITABLE" };
  }

  return {
    ok: true,
    document: {
      ...existing,
      title: input.title !== undefined ? updated.title : existing.title,
      shortDescription:
        input.shortDescription !== undefined
          ? (updated.shortDescription ?? "")
          : existing.shortDescription,
      description:
        input.description !== undefined ? (updated.description ?? "") : existing.description,
      policy: {
        ...existing.policy,
        score: score.score,
        xpPerCompletion:
          input.xpPerCompletion !== undefined
            ? updated.xpPerCompletion
            : existing.policy.xpPerCompletion,
      },
      catalog:
        input.genre !== undefined && existing.catalog.type === "GENRE_MODE"
          ? { ...existing.catalog, genre: updated.genre }
          : existing.catalog,
      updatedAt: updated.updatedAt,
    },
  };
}

/** Creates the first generic canonical only after D1 has all required score-policy fields. */
export function mapUserGameRecordToCanonical(
  record: SandboxGameRecord,
): GameCanonicalDocument | null {
  if (!isCreatorScorePolicyConfigured(record)) return null;
  return {
    schemaVersion: GAME_CANONICAL_SCHEMA_VERSION,
    slug: record.slug,
    title: record.title,
    shortDescription: record.shortDescription ?? "",
    description: record.description ?? "",
    policy: {
      score: scoreConfig({
        unit: record.scoreUnit,
        direction: record.scoreDirection,
        min: record.scoreMin,
        max: record.scoreMax,
        displayPrefix: record.scoreDisplayPrefix,
        displaySuffix: record.scoreDisplaySuffix,
      }),
      leaderboard: true,
      xpPerCompletion: record.xpPerCompletion,
      requiresAuth: false,
    },
    supportsReplay: false,
    catalog: { type: "GENRE_MODE", genre: record.genre, mode: record.mode },
    updatedAt: record.updatedAt,
  };
}
