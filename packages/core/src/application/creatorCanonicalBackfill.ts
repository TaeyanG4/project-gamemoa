/**
 * Stage B-2 of the Creator B2 Canonical Registry migration — the orchestration behind a
 * dry-run/apply backfill tool that uses Stage B-1's pure mapper
 * (domain/creatorGameCanonicalMapper.ts) and Stage A's storage port
 * (ports/creatorGameDefinition.ts) to compare D1's current rows against what's already stored in
 * B2, and (in apply mode) create whatever's missing. This PR builds the tool and its tests —
 * nothing here is run against production D1/B2, no route calls it, and no other consumer wires
 * this up. See scripts/creator-canonical-backfill.ts for the CLI wrapper that actually reads an
 * exported-rows file and calls into this module.
 *
 * Everything below is provider-neutral and depends only on {@link CreatorGameDefinitionRepository}
 * (the same port Stage A's B2 adapter already implements) — no B2/D1/fetch anywhere in this file.
 *
 * `dry-run` (`classifyBackfillRows`) and `apply` (`applyBackfill`) are two textually separate
 * functions, not one function with an `apply: boolean` parameter — that's deliberate: there is no
 * boolean a caller could default, forget, or accidentally flip to turn a dry-run into a write.
 * Calling `applyBackfill` at all is the "explicit flag" this Stage's own requirement calls for.
 */

import type { SandboxGameRecordCanonicalSource } from "../domain/creatorGameCanonicalMapper.js";
import { mapSandboxGameRecordToCanonical } from "../domain/creatorGameCanonicalMapper.js";
import type { CreatorCanonicalMappingBlockReason } from "../domain/creatorGameCanonicalMapper.js";
import type { CreatorGameCanonicalDocument } from "../domain/creatorGameCanonicalDocument.js";
import type { CreatorGameDefinitionRepository } from "../ports/creatorGameDefinition.js";

/**
 * One D1 row's backfill status, relative to what's currently in B2:
 *   - `MISSING`: no B2 document exists yet at this slug's key — a normal "would create" state,
 *     not an error.
 *   - `MATCH`: a B2 document already exists and is byte-for-byte (deep) equal to what
 *     {@link mapSandboxGameRecordToCanonical} would produce from the current row right now.
 *   - `BLOCKED`: the row's own score policy is incomplete — Stage B-1's mapper already refuses to
 *     produce a document for this row at all (see that function's own doc comment on why); this
 *     mirrors that refusal, carrying the same {@link CreatorCanonicalMappingBlockReason}.
 *   - `CONFLICT`: a B2 document exists, but it disagrees with what the row maps to today. Never
 *     auto-resolved by this module — see {@link applyBackfill}'s own doc comment on why apply mode
 *     refuses to touch this.
 *   - `ERROR`: reading the existing B2 document itself failed — a malformed/unreadable stored
 *     document (propagated from `CreatorGameDefinitionRepository.findBySlug`, e.g. a
 *     `CreatorGameCanonicalDocumentError`) or a raw storage failure. Distinct from `BLOCKED`
 *     (a row-data problem) and from `CONFLICT` (a real, readable disagreement) — this is "couldn't
 *     even find out".
 */
export type BackfillRowStatus =
  | {
      readonly kind: "MISSING";
      readonly slug: string;
      readonly document: CreatorGameCanonicalDocument;
    }
  | { readonly kind: "MATCH"; readonly slug: string }
  | {
      readonly kind: "BLOCKED";
      readonly slug: string;
      readonly reason: CreatorCanonicalMappingBlockReason;
    }
  | {
      readonly kind: "CONFLICT";
      readonly slug: string;
      readonly generated: CreatorGameCanonicalDocument;
      readonly stored: CreatorGameCanonicalDocument;
    }
  | { readonly kind: "ERROR"; readonly slug: string; readonly message: string };

/** Every {@link BackfillRowStatus} kind, in the fixed order summaries report them — not
 * alphabetical, but roughly "how much attention does this need", MISSING/MATCH (routine) first. */
export const BACKFILL_ROW_STATUS_KINDS = [
  "MISSING",
  "MATCH",
  "BLOCKED",
  "CONFLICT",
  "ERROR",
] as const;

export interface BackfillSummary {
  readonly statuses: readonly BackfillRowStatus[];
  readonly counts: Readonly<Record<(typeof BACKFILL_ROW_STATUS_KINDS)[number], number>>;
}

function summarize(statuses: readonly BackfillRowStatus[]): BackfillSummary {
  const counts = { MISSING: 0, MATCH: 0, BLOCKED: 0, CONFLICT: 0, ERROR: 0 };
  for (const status of statuses) counts[status.kind]++;
  return { statuses, counts };
}

/** Plain structural equality over the JSON-safe values a `CreatorGameCanonicalDocument` is made
 * of — key order never matters (two objects built by different code paths, like a freshly-mapped
 * document and one round-tripped through JSON, are not guaranteed to insert keys in the same
 * order). Deliberately hand-rolled rather than `node:util`'s `isDeepStrictEqual`: `packages/core`
 * has to stay runnable inside a Cloudflare Worker, where Node builtins aren't guaranteed. */
export function canonicalDocumentsEqual(
  a: CreatorGameCanonicalDocument,
  b: CreatorGameCanonicalDocument,
): boolean {
  return deepEqualJson(a, b);
}

function deepEqualJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((value, index) => deepEqualJson(value, b[index]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj).sort();
    const bKeys = Object.keys(bObj).sort();
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key, index) => key === bKeys[index] && deepEqualJson(aObj[key], bObj[key]));
  }
  return false;
}

/** Classifies exactly one row — the unit both {@link classifyBackfillRows} and
 * {@link applyBackfill} build on. Read-only: calls `repo.findBySlug` and nothing else on the
 * repository, regardless of what it finds. */
export async function classifyBackfillRow(
  row: SandboxGameRecordCanonicalSource,
  repo: CreatorGameDefinitionRepository,
): Promise<BackfillRowStatus> {
  const mapped = mapSandboxGameRecordToCanonical(row);
  if (!mapped.ok) {
    return { kind: "BLOCKED", slug: row.slug, reason: mapped.reason };
  }

  let stored: CreatorGameCanonicalDocument | null;
  try {
    stored = await repo.findBySlug(row.slug);
  } catch (err) {
    return {
      kind: "ERROR",
      slug: row.slug,
      message: err instanceof Error ? err.message : String(err),
    };
  }

  if (stored === null) {
    return { kind: "MISSING", slug: row.slug, document: mapped.document };
  }
  if (canonicalDocumentsEqual(stored, mapped.document)) {
    return { kind: "MATCH", slug: row.slug };
  }
  return { kind: "CONFLICT", slug: row.slug, generated: mapped.document, stored };
}

/**
 * Dry-run: classifies every row, writes nothing, ever. Safe to call against a real
 * `CreatorGameDefinitionRepository` at any time — the only repository method this reaches is
 * `findBySlug`. Rows are classified independently and in the order given; one row's `ERROR`
 * never stops the rest from being classified.
 */
export async function classifyBackfillRows(
  rows: readonly SandboxGameRecordCanonicalSource[],
  repo: CreatorGameDefinitionRepository,
): Promise<BackfillSummary> {
  const statuses: BackfillRowStatus[] = [];
  for (const row of rows) {
    statuses.push(await classifyBackfillRow(row, repo));
  }
  return summarize(statuses);
}

export type BackfillApplyOutcome =
  | { readonly kind: "CREATED"; readonly slug: string }
  | { readonly kind: "SKIPPED"; readonly slug: string; readonly status: BackfillRowStatus["kind"] }
  | { readonly kind: "WRITE_FAILED"; readonly slug: string; readonly message: string }
  | { readonly kind: "PARITY_MISMATCH_AFTER_WRITE"; readonly slug: string };

export interface BackfillApplyResult {
  /** The same dry-run classification apply started from — every CONFLICT/BLOCKED/ERROR/MATCH row
   * visible here is exactly why the corresponding outcome below is SKIPPED, not guessed at. */
  readonly summary: BackfillSummary;
  readonly outcomes: readonly BackfillApplyOutcome[];
}

/**
 * Apply mode: classifies every row exactly like {@link classifyBackfillRows} (so the same summary
 * counts are available), then writes ONLY the rows classified `MISSING` — `MATCH` is a no-op,
 * and `BLOCKED`/`CONFLICT`/`ERROR` are always `SKIPPED`, never written, with no override or
 * force option anywhere in this module. There is deliberately no way to make this overwrite an
 * existing B2 document: `save` is only ever called for a slug `findBySlug` just confirmed is
 * `null`.
 *
 * Each MISSING row is written and independently re-read to confirm parity — `save` succeeding is
 * not itself treated as proof the document is now correctly readable back (a defensive check
 * against, e.g., an adapter bug or an eventually-consistent store surfacing something other than
 * what was just written). A row's write failure or parity mismatch never stops the loop — every
 * other MISSING row is still attempted, and nothing already written by this same run (or any
 * earlier one) is ever deleted or rolled back. The full set of independent per-row outcomes is
 * returned so the caller can decide what to do about any failures; this function itself never
 * throws for a single row's failure.
 */
export async function applyBackfill(
  rows: readonly SandboxGameRecordCanonicalSource[],
  repo: CreatorGameDefinitionRepository,
): Promise<BackfillApplyResult> {
  const summary = await classifyBackfillRows(rows, repo);
  const outcomes: BackfillApplyOutcome[] = [];

  for (const status of summary.statuses) {
    if (status.kind !== "MISSING") {
      outcomes.push({ kind: "SKIPPED", slug: status.slug, status: status.kind });
      continue;
    }

    try {
      await repo.save(status.document);
    } catch (err) {
      outcomes.push({
        kind: "WRITE_FAILED",
        slug: status.slug,
        message: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    try {
      const readBack = await repo.findBySlug(status.slug);
      if (readBack === null || !canonicalDocumentsEqual(readBack, status.document)) {
        outcomes.push({ kind: "PARITY_MISMATCH_AFTER_WRITE", slug: status.slug });
        continue;
      }
    } catch (err) {
      outcomes.push({
        kind: "WRITE_FAILED",
        slug: status.slug,
        message: `save succeeded but the parity re-read failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      continue;
    }

    outcomes.push({ kind: "CREATED", slug: status.slug });
  }

  return { summary, outcomes };
}
