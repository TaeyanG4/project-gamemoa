/**
 * Unified Game Platform, Stage U-2 — non-destructive migration/parity orchestration from today's
 * production Creator canonical (`creator-games/<slug>/definition.json`,
 * ports/creatorGameDefinition.ts, Stage A) to the new generic canonical
 * (`game-definitions/<slug>/definition.json`, modules/game/domain/gameCanonicalDocument.ts, Stage
 * U-1). Modeled directly on Stage B-2's own dry-run/apply tool
 * (application/creatorCanonicalBackfill.ts) — same shape, same safety principles, applied to a
 * different source/destination pair. Nothing here is wired to a route, a script, or production
 * B2/D1 in this PR; the source Creator object is never deleted, and this file never touches
 * anything but `findBySlug`/`save` on the two ports it's given.
 *
 * `classifyGenericCanonicalMigrationRows` (dry-run) and `applyGenericCanonicalMigration` (apply)
 * are two textually separate functions, not one function with an `apply: boolean` parameter — same
 * reasoning as Stage B-2's own top doc comment: there is no boolean a caller could default, forget,
 * or accidentally flip to turn a dry-run into a write.
 *
 * Everything below is provider-neutral and depends only on {@link CreatorGameDefinitionRepository}
 * and {@link GameCanonicalRepository} (both ports, both already implemented by real B2 adapters in
 * `packages/db` — see B2CreatorGameDefinitionRepository.ts, Stage A, and
 * B2GameCanonicalRepository.ts, this Stage) — no B2/D1/fetch anywhere in this file.
 *
 * IMPORTANT — no-overwrite is best-effort, not atomic, for exactly the reason Stage B-2's own top
 * doc comment documents at length (B2's S3-compatible API has no conditional-write primitive this
 * port could build on). `applyGenericCanonicalMigration` re-checks the destination immediately
 * before every `save` to shrink the unsafe window, the same way `applyBackfill` does — see that
 * function's own doc comment for the full disclosure. Treat this tool as single-operator,
 * non-concurrent by operational convention, not because the code enforces it.
 */

import type { CreatorGameCanonicalDocument } from "../domain/creatorGameCanonicalDocument.js";
import type { CreatorGameDefinitionRepository } from "../ports/creatorGameDefinition.js";
import { creatorCanonicalDocumentToGameCanonicalDocument } from "../modules/game/domain/gameCanonicalMigration.js";
import {
  GameCanonicalDocumentError,
  parseGameCanonicalDocument,
  serializeGameCanonicalDocument,
  type GameCanonicalDocument,
} from "../modules/game/domain/gameCanonicalDocument.js";
import type { GameCanonicalRepository } from "../modules/game/ports/gameCanonicalRepository.js";
import { jsonDeepEqual } from "./jsonDeepEqual.js";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * One slug's migration status, relative to what's currently at the generic canonical key:
 *   - `SOURCE_MISSING`: no Creator canonical document exists at this slug at all
 *     (`CreatorGameDefinitionRepository.findBySlug` returned `null` — a plain 404, not an error).
 *     Distinct from every other kind below: there is nothing here to convert, block, or conflict
 *     with.
 *   - `MISSING`: a Creator canonical document exists, converts into a generic canonical document
 *     that the standard {@link parseGameCanonicalDocument} parser accepts, and nothing exists yet
 *     at the generic canonical key — a normal "would create" state, not an error.
 *   - `MATCH`: a generic canonical document already exists at the destination and is (deep) equal
 *     to what converting the current Creator source would produce right now.
 *   - `BLOCKED`: the Creator source was read successfully and converts structurally, but the
 *     *converted* document fails the generic canonical schema's own semantic invariants (e.g.
 *     `score.min >= score.max`, `score: null` paired with `leaderboard: true`, an out-of-range
 *     `xpPerCompletion`) — see gameCanonicalDocument.ts's own doc comment on why those are rejected
 *     even though they may have been representable in the looser Creator canonical schema. Never
 *     written, ever, in apply mode. `reason` carries the exact
 *     `GameCanonicalDocumentError`/parse-failure message.
 *   - `CONFLICT`: a generic canonical document exists, but it disagrees with what converting the
 *     current Creator source produces today. Never auto-resolved — see
 *     {@link applyGenericCanonicalMigration}'s own doc comment on why apply mode refuses to touch
 *     this.
 *   - `ERROR`: a read itself failed — either reading the Creator source (`stage: "SOURCE_READ"`,
 *     e.g. a malformed stored Creator document propagating as a thrown
 *     `CreatorGameCanonicalDocumentError`, or a raw storage failure) or reading the generic
 *     canonical destination (`stage: "DESTINATION_READ"`, the same shape of failure on the other
 *     port). Distinct from `BLOCKED` (a real, readable document whose *content* is rejected) and
 *     from `CONFLICT` (a real, readable disagreement) — this is "couldn't even find out".
 */
export type GenericCanonicalMigrationRowStatus =
  | { readonly kind: "SOURCE_MISSING"; readonly slug: string }
  | { readonly kind: "MISSING"; readonly slug: string; readonly document: GameCanonicalDocument }
  | { readonly kind: "MATCH"; readonly slug: string }
  | { readonly kind: "BLOCKED"; readonly slug: string; readonly reason: string }
  | {
      readonly kind: "CONFLICT";
      readonly slug: string;
      readonly generated: GameCanonicalDocument;
      readonly stored: GameCanonicalDocument;
    }
  | {
      readonly kind: "ERROR";
      readonly slug: string;
      readonly stage: "SOURCE_READ" | "DESTINATION_READ";
      readonly message: string;
    };

/** Every {@link GenericCanonicalMigrationRowStatus} kind, in the fixed order summaries report
 * them — routine states first, same convention as Stage B-2's own
 * `BACKFILL_ROW_STATUS_KINDS`. */
export const GENERIC_CANONICAL_MIGRATION_ROW_STATUS_KINDS = [
  "SOURCE_MISSING",
  "MISSING",
  "MATCH",
  "BLOCKED",
  "CONFLICT",
  "ERROR",
] as const;

export interface GenericCanonicalMigrationSummary {
  readonly statuses: readonly GenericCanonicalMigrationRowStatus[];
  readonly counts: Readonly<
    Record<(typeof GENERIC_CANONICAL_MIGRATION_ROW_STATUS_KINDS)[number], number>
  >;
}

function summarize(
  statuses: readonly GenericCanonicalMigrationRowStatus[],
): GenericCanonicalMigrationSummary {
  const counts = {
    SOURCE_MISSING: 0,
    MISSING: 0,
    MATCH: 0,
    BLOCKED: 0,
    CONFLICT: 0,
    ERROR: 0,
  };
  for (const status of statuses) counts[status.kind]++;
  return { statuses, counts };
}

/**
 * Converts a Creator canonical document into the generic canonical schema and validates the result
 * through the exact same standard parser production reads/writes will use — a round-trip through
 * `serializeGameCanonicalDocument`/`parseGameCanonicalDocument`, not a re-implementation of its
 * rules. This is deliberate: the pure converter (`creatorCanonicalDocumentToGameCanonicalDocument`,
 * Stage U-1) is total and structurally lossless, but the existing Creator canonical schema's own
 * semantic validation is looser than the generic schema's (see this file's own top doc comment) —
 * an inverted score range, `score: null` + `leaderboard: true`, or an out-of-bounds
 * `xpPerCompletion` can all exist in a stored Creator document today without ever having been
 * rejected by *that* schema's parser. Returns the parsed (not just converted) document on success,
 * since that is byte-for-byte what a real `GameCanonicalRepository.save` → `findBySlug` round-trip
 * would hand back.
 */
function convertAndValidate(
  source: CreatorGameCanonicalDocument,
):
  | { readonly ok: true; readonly document: GameCanonicalDocument }
  | { readonly ok: false; readonly reason: string } {
  const converted = creatorCanonicalDocumentToGameCanonicalDocument(source);
  try {
    const validated = parseGameCanonicalDocument(
      serializeGameCanonicalDocument(converted),
      source.slug,
    );
    return { ok: true, document: validated };
  } catch (err) {
    const reason = err instanceof GameCanonicalDocumentError ? err.message : errorMessage(err);
    return { ok: false, reason };
  }
}

/** Classifies exactly one slug — the unit both {@link classifyGenericCanonicalMigrationRows} and
 * {@link applyGenericCanonicalMigration} build on. Read-only: calls `findBySlug` on `source` and
 * (only when the source converts to a valid document) on `destination`, and nothing else,
 * regardless of what either finds. */
export async function classifyGenericCanonicalMigrationRow(
  slug: string,
  source: CreatorGameDefinitionRepository,
  destination: GameCanonicalRepository,
): Promise<GenericCanonicalMigrationRowStatus> {
  let sourceDoc: CreatorGameCanonicalDocument | null;
  try {
    sourceDoc = await source.findBySlug(slug);
  } catch (err) {
    return { kind: "ERROR", slug, stage: "SOURCE_READ", message: errorMessage(err) };
  }
  if (sourceDoc === null) {
    return { kind: "SOURCE_MISSING", slug };
  }

  const conversion = convertAndValidate(sourceDoc);
  if (!conversion.ok) {
    return { kind: "BLOCKED", slug, reason: conversion.reason };
  }
  const generated = conversion.document;

  let stored: GameCanonicalDocument | null;
  try {
    stored = await destination.findBySlug(slug);
  } catch (err) {
    return { kind: "ERROR", slug, stage: "DESTINATION_READ", message: errorMessage(err) };
  }

  if (stored === null) {
    return { kind: "MISSING", slug, document: generated };
  }
  if (jsonDeepEqual(stored, generated)) {
    return { kind: "MATCH", slug };
  }
  return { kind: "CONFLICT", slug, generated, stored };
}

/**
 * Dry-run: classifies every slug, writes nothing, ever. Safe to call against real
 * `CreatorGameDefinitionRepository`/`GameCanonicalRepository` adapters at any time — the only
 * methods either port sees are their respective `findBySlug`. Slugs are classified independently
 * and in the order given; one slug's `ERROR` never stops the rest from being classified.
 */
export async function classifyGenericCanonicalMigrationRows(
  slugs: readonly string[],
  source: CreatorGameDefinitionRepository,
  destination: GameCanonicalRepository,
): Promise<GenericCanonicalMigrationSummary> {
  const statuses: GenericCanonicalMigrationRowStatus[] = [];
  for (const slug of slugs) {
    statuses.push(await classifyGenericCanonicalMigrationRow(slug, source, destination));
  }
  return summarize(statuses);
}

export type GenericCanonicalMigrationApplyOutcome =
  | { readonly kind: "CREATED"; readonly slug: string }
  | {
      readonly kind: "SKIPPED";
      readonly slug: string;
      readonly status: GenericCanonicalMigrationRowStatus["kind"];
    }
  | { readonly kind: "RACE_LOST"; readonly slug: string }
  | { readonly kind: "WRITE_FAILED"; readonly slug: string; readonly message: string }
  | { readonly kind: "PARITY_MISMATCH_AFTER_WRITE"; readonly slug: string };

export interface GenericCanonicalMigrationApplyResult {
  /** The same dry-run classification apply started from — every SOURCE_MISSING/MATCH/BLOCKED/
   * CONFLICT/ERROR slug visible here is exactly why the corresponding outcome below is SKIPPED,
   * not guessed at. */
  readonly summary: GenericCanonicalMigrationSummary;
  readonly outcomes: readonly GenericCanonicalMigrationApplyOutcome[];
}

/**
 * Apply mode: classifies every slug exactly like {@link classifyGenericCanonicalMigrationRows} (so
 * the same summary counts are available), then writes ONLY the slugs classified `MISSING` —
 * `MATCH` is a no-op, and `SOURCE_MISSING`/`BLOCKED`/`CONFLICT`/`ERROR` are always `SKIPPED`, never
 * written, with no override/force option anywhere in this module (matching Stage B-2's own
 * `applyBackfill` exactly).
 *
 * No-overwrite is enforced as strongly as `GameCanonicalRepository` allows, but is NOT atomic —
 * see this file's own top doc comment for why. Concretely: `classifyGenericCanonicalMigrationRows`
 * above already confirms `destination.findBySlug` is `null` for every `MISSING` slug, but that
 * check happened before this loop started, and other slugs ahead of it in this same batch (or a
 * fully separate concurrent run) had time to write in between. So immediately before each `save`,
 * this function re-checks `destination.findBySlug` one more time — if a document now exists, the
 * slug becomes `RACE_LOST` and `save` is never called.
 *
 * Each MISSING slug that passes the recheck is written and independently re-read to confirm parity
 * — `save` succeeding is not itself treated as proof the document is now correctly readable back.
 * A slug's write failure, recheck failure, or parity mismatch never stops the loop — every other
 * MISSING slug is still attempted, and nothing already written by this same run (or any earlier
 * one) is ever deleted or rolled back — this module never deletes the Creator source, and never
 * deletes/rolls back a generic canonical document it (or an earlier run) already wrote. Running
 * this function again over the same slugs after a successful apply is idempotent: every
 * previously-created slug now classifies as `MATCH` and is skipped, not rewritten.
 */
export async function applyGenericCanonicalMigration(
  slugs: readonly string[],
  source: CreatorGameDefinitionRepository,
  destination: GameCanonicalRepository,
): Promise<GenericCanonicalMigrationApplyResult> {
  const summary = await classifyGenericCanonicalMigrationRows(slugs, source, destination);
  const outcomes: GenericCanonicalMigrationApplyOutcome[] = [];

  for (const status of summary.statuses) {
    if (status.kind !== "MISSING") {
      outcomes.push({ kind: "SKIPPED", slug: status.slug, status: status.kind });
      continue;
    }

    // Best-effort TOCTOU-window reduction, not an atomic conditional-create — see this function's
    // own doc comment and the file's top doc comment for why.
    let recheck: GameCanonicalDocument | null;
    try {
      recheck = await destination.findBySlug(status.slug);
    } catch (err) {
      outcomes.push({
        kind: "WRITE_FAILED",
        slug: status.slug,
        message: `pre-write race recheck failed: ${errorMessage(err)}`,
      });
      continue;
    }
    if (recheck !== null) {
      outcomes.push({ kind: "RACE_LOST", slug: status.slug });
      continue;
    }

    try {
      await destination.save(status.document);
    } catch (err) {
      outcomes.push({ kind: "WRITE_FAILED", slug: status.slug, message: errorMessage(err) });
      continue;
    }

    try {
      const readBack = await destination.findBySlug(status.slug);
      if (readBack === null || !jsonDeepEqual(readBack, status.document)) {
        outcomes.push({ kind: "PARITY_MISMATCH_AFTER_WRITE", slug: status.slug });
        continue;
      }
    } catch (err) {
      outcomes.push({
        kind: "WRITE_FAILED",
        slug: status.slug,
        message: `save succeeded but the parity re-read failed: ${errorMessage(err)}`,
      });
      continue;
    }

    outcomes.push({ kind: "CREATED", slug: status.slug });
  }

  return { summary, outcomes };
}
