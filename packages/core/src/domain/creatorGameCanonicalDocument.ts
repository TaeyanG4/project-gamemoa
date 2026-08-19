/**
 * Creator canonical game definition — Stage A of the Creator B2 Canonical Registry migration.
 *
 * Today, a Creator game's metadata lives entirely in `sandbox_games` (D1) — see
 * ports/sandboxGames.ts's `SandboxGameRecord`. The long-term shape this migration is heading
 * toward mirrors how SYSTEM games already split (game-registry/games/<slug>/{info,policy}.json,
 * checked into git — see game-registry/README.md):
 *
 *   SYSTEM  → Git GameRegistry (game-registry/)
 *   CREATOR → B2 canonical definition (this file's own document) + D1 runtime/transactional state
 *
 * D1 keeps everything this document deliberately does NOT carry: game/version identity (the D1
 * row id, never this document), developer identity (ownerUserId — see this file's own note
 * below), review state, the live version pointer, visibility/availability, and attempts/scores.
 * All of that is either relational (foreign-keyed to `users`/`sandbox_game_versions`) or
 * transactional (changes via a review decision, a visibility toggle, a score submission) — not
 * "what the game is", which is the one thing this document exists to describe.
 *
 * **This PR (Stage A) only builds the storage foundation** — the key layout, the document schema,
 * a persistence port, and a B2-backed adapter. Nothing here is wired into the production
 * GameRegistry, no D1 data is migrated or dual-read, and no route touches this yet. See this
 * module's own consumers (or lack thereof) for confirmation.
 *
 * ## Canonical vs. D1 boundary, explicitly
 *
 * Canonical (this document) — "what the game is", the same three categories
 * GameDefinition/GameManifest already use for SYSTEM games:
 *   - **metadata**: title, shortDescription, description, genre, mode.
 *   - **policy**: score config, leaderboard participation, xpPerCompletion, requiresAuth — reuses
 *     `ScoreConfig` verbatim, the same way `GameDefinition.policy` does. These are operator
 *     decisions (see gameDefinition.ts's own `GamePolicy` doc comment on why xpPerCompletion in
 *     particular must never be author-declared), but they still describe the game's *rules*, not
 *     its *state* — no different from how SYSTEM's game-registry/policy.json is operator-written
 *     yet still lives in the same git-tracked canonical description as info.json.
 *   - **presentation**: reuses `GamePresentation` verbatim, exactly like `GameDefinition` does.
 *     Optional and unpopulated by anything in this PR — Creator Presentation wiring is a later
 *     PR's job (see GamePresentation's own doc comment on what's deferred).
 *
 * D1-only, never duplicated here:
 *   - **ownerUserId / developer identity**. A relational fact (foreign-keyed to `users`, subject
 *     to account moderation/merge) rather than a description of the game itself — B2 has no
 *     foreign-key relationship to `users` to keep it consistent with anyway. `slug` is what this
 *     document is keyed and looked up by (see {@link creatorGameDefinitionObjectKey}), not
 *     ownership.
 *   - **review/publish status, visibility, liveVersionId**: SandboxGameVersionStatus/
 *     SandboxGamePublishStatus/SandboxGameVisibility (domain/sandboxGames.ts) are all
 *     transactional axes that change independently of anything about what the game IS — a
 *     PENDING_REVIEW game and an APPROVED one can have byte-identical canonical documents.
 *   - **attempts/scores**: submission data, not a game description, and D1-transactional by
 *     nature (see ports/gameAttempt.js, ports/repositories.js's ScoreRepository).
 *   - **D1 row id**: an implementation detail of the D1 table, meaningless outside it — this
 *     document is looked up by `slug` alone.
 *
 * ## Known v1 gap, not resolved by this PR
 *
 * `genre: string` (matching `SandboxGameRecord.genre` today) rather than GameDefinition's
 * `categories: readonly string[]` — Creator submissions don't collect categories/tags/
 * inputMethods/thumbnail/minPlayers/maxPlayers yet (`RawGameRegistrationManifest`,
 * domain/sandboxGameBundle.ts, has none of them either), so this document doesn't invent fields
 * nothing currently produces. Reconciling that mismatch belongs to whichever future PR actually
 * expands Creator metadata collection — `schemaVersion` exists specifically so that can happen as
 * a clean v2, not an ambiguous partial migration of v1 readers.
 *
 * Never store an environment-specific value (an API URL, a bucket name, ...) in this document —
 * it is meant to be read identically regardless of which environment/host resolves it.
 */

import type { GamePresentation } from "@owogg/game-sdk/contracts";
import type { ScoreConfig } from "@owogg/game-sdk/contracts";
import type { SandboxGameMode } from "./sandboxGames.js";

export const CREATOR_GAME_DEFINITION_SCHEMA_VERSION = 1 as const;

/** Operator-controlled rules — see this file's own top doc comment for why these still count as
 * "canonical" despite being operator-, not author-, decided. Mirrors `GameDefinition.policy`
 * (packages/core/src/modules/game/domain/gameDefinition.ts) field-for-field. */
export interface CreatorGameCanonicalPolicy {
  readonly score: ScoreConfig | null;
  readonly leaderboard: boolean;
  readonly xpPerCompletion: number;
  readonly requiresAuth: boolean;
}

export interface CreatorGameCanonicalDocument {
  readonly schemaVersion: typeof CREATOR_GAME_DEFINITION_SCHEMA_VERSION;
  /** Global, immutable identity — same guarantee `GameDefinition.slug` already documents (never
   * changes once a game ships; everything keyed by it — scores, favorites, this document's own
   * storage key — would orphan otherwise). */
  readonly slug: string;
  readonly title: string;
  readonly shortDescription: string;
  readonly description: string;
  /** See this file's own "Known v1 gap" note — not GameDefinition's `categories`. */
  readonly genre: string;
  readonly mode: SandboxGameMode;
  readonly policy: CreatorGameCanonicalPolicy;
  /** Unpopulated by anything in this PR — see this file's own top doc comment. */
  readonly presentation?: GamePresentation | undefined;
  /** When this exact document was last written — provenance for debugging/audit, not a review or
   * publish timestamp (those stay in D1, on the row they actually describe). */
  readonly updatedAt: string;
}

/**
 * Deterministic B2 key for a Creator game's canonical definition — keyed by `slug`, the one
 * immutable identity GameDefinition already establishes (see that type's own doc comment).
 * Deliberately a *separate* prefix from bundle storage's `games/<gameId>/<versionId>/...`
 * (domain/sandboxGameBundle.ts's `publishedObjectKey`) and `uploads/<gameId>/...`
 * (`sourceArchiveObjectKey`) — a game-level canonical description and a version's published
 * bytes have entirely different lifetimes (this document survives every version; a published
 * version's objects are deleted by a future version GC independently of it) and are keyed by
 * different identities (slug vs. the D1 `gameId`), so sharing a prefix would only invite an
 * accidental collision or a GC that deletes the wrong thing.
 */
export function creatorGameDefinitionObjectKey(slug: string): string {
  return `creator-games/${slug}/definition.json`;
}

export function serializeCreatorGameCanonicalDocument(
  document: CreatorGameCanonicalDocument,
): string {
  return JSON.stringify(document);
}

export const CREATOR_GAME_CANONICAL_DOCUMENT_REJECTIONS = [
  "MALFORMED_JSON",
  "UNSUPPORTED_SCHEMA_VERSION",
  "SLUG_MISMATCH",
  "INVALID_DOCUMENT",
] as const;
export type CreatorGameCanonicalDocumentRejection =
  (typeof CREATOR_GAME_CANONICAL_DOCUMENT_REJECTIONS)[number];

/** Thrown by {@link parseCreatorGameCanonicalDocument} — never silently swallowed into a default
 * or empty document (see that function's own doc comment). `detail` is a short, non-sensitive
 * diagnostic (a field name, a value) — never the raw stored bytes. */
export class CreatorGameCanonicalDocumentError extends Error {
  constructor(
    public readonly code: CreatorGameCanonicalDocumentRejection,
    detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
  }
}

function fail(code: CreatorGameCanonicalDocumentRejection, detail?: string): never {
  throw new CreatorGameCanonicalDocumentError(code, detail);
}

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail("INVALID_DOCUMENT", `${context} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function requireString(obj: Record<string, unknown>, field: string): string {
  const value = obj[field];
  if (typeof value !== "string") fail("INVALID_DOCUMENT", `${field} must be a string`);
  return value;
}

function requireBoolean(obj: Record<string, unknown>, field: string): boolean {
  const value = obj[field];
  if (typeof value !== "boolean") fail("INVALID_DOCUMENT", `${field} must be a boolean`);
  return value;
}

function requireNumber(obj: Record<string, unknown>, field: string): number {
  const value = obj[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail("INVALID_DOCUMENT", `${field} must be a finite number`);
  }
  return value;
}

const SCORE_DIRECTIONS = ["asc", "desc"] as const;

function parseScoreConfig(value: unknown): ScoreConfig {
  const raw = asRecord(value, "policy.score");
  const direction = requireString(raw, "direction");
  if (!(SCORE_DIRECTIONS as readonly string[]).includes(direction)) {
    fail(
      "INVALID_DOCUMENT",
      `policy.score.direction must be one of ${SCORE_DIRECTIONS.join(", ")}`,
    );
  }
  const min = requireNumber(raw, "min");
  const max = requireNumber(raw, "max");
  const displayPrefix = raw.displayPrefix;
  const displaySuffix = raw.displaySuffix;
  if (displayPrefix !== undefined && typeof displayPrefix !== "string") {
    fail("INVALID_DOCUMENT", "policy.score.displayPrefix must be a string when present");
  }
  if (displaySuffix !== undefined && typeof displaySuffix !== "string") {
    fail("INVALID_DOCUMENT", "policy.score.displaySuffix must be a string when present");
  }
  return {
    unit: requireString(raw, "unit"),
    direction: direction as ScoreConfig["direction"],
    min,
    max,
    ...(typeof displayPrefix === "string" ? { displayPrefix } : {}),
    ...(typeof displaySuffix === "string" ? { displaySuffix } : {}),
  };
}

function parsePolicy(value: unknown): CreatorGameCanonicalPolicy {
  const raw = asRecord(value, "policy");
  if (!("score" in raw))
    fail("INVALID_DOCUMENT", "policy.score is required (use null if unscored)");
  const score = raw.score === null ? null : parseScoreConfig(raw.score);
  return {
    score,
    leaderboard: requireBoolean(raw, "leaderboard"),
    xpPerCompletion: requireNumber(raw, "xpPerCompletion"),
    requiresAuth: requireBoolean(raw, "requiresAuth"),
  };
}

const SANDBOX_GAME_MODE_VALUES = ["single", "multi"] as const;

/**
 * Parses and validates a stored canonical document's JSON text against every fail-closed
 * condition Stage A requires: malformed JSON, an unsupported `schemaVersion`, a stored `slug`
 * that doesn't match what the caller actually requested, or a shape that isn't a valid document
 * at all. None of these ever produce a silent empty/default document — every failure throws
 * {@link CreatorGameCanonicalDocumentError}, which callers (the B2 adapter) propagate rather than
 * swallow. `presentation`, if present, is only shape-checked as a plain object here — it is
 * unpopulated by anything in this PR, so deep-validating its internal shape is deferred to
 * whichever future PR actually starts writing one (see scripts/game-registry-schema.ts's
 * `parsePresentation` for what that will eventually reuse).
 */
export function parseCreatorGameCanonicalDocument(
  jsonText: string,
  expectedSlug: string,
): CreatorGameCanonicalDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    fail("MALFORMED_JSON");
  }

  const obj = asRecord(parsed, "document");

  const schemaVersion = obj.schemaVersion;
  if (schemaVersion !== CREATOR_GAME_DEFINITION_SCHEMA_VERSION) {
    fail("UNSUPPORTED_SCHEMA_VERSION", `got ${JSON.stringify(schemaVersion)}`);
  }

  const slug = requireString(obj, "slug");
  if (slug !== expectedSlug) {
    fail("SLUG_MISMATCH", `stored "${slug}" != requested "${expectedSlug}"`);
  }

  const mode = requireString(obj, "mode");
  if (!(SANDBOX_GAME_MODE_VALUES as readonly string[]).includes(mode)) {
    fail("INVALID_DOCUMENT", `mode must be one of ${SANDBOX_GAME_MODE_VALUES.join(", ")}`);
  }

  if (!("policy" in obj)) fail("INVALID_DOCUMENT", "policy is required");
  const policy = parsePolicy(obj.policy);

  let presentation: GamePresentation | undefined;
  if (obj.presentation !== undefined) {
    // Shape-only check — see this function's own doc comment on why a deep GamePresentation
    // validation isn't duplicated here.
    asRecord(obj.presentation, "presentation");
    presentation = obj.presentation as GamePresentation;
  }

  return {
    schemaVersion: CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
    slug,
    title: requireString(obj, "title"),
    shortDescription: requireString(obj, "shortDescription"),
    description: requireString(obj, "description"),
    genre: requireString(obj, "genre"),
    mode: mode as SandboxGameMode,
    policy,
    ...(presentation !== undefined ? { presentation } : {}),
    updatedAt: requireString(obj, "updatedAt"),
  };
}
