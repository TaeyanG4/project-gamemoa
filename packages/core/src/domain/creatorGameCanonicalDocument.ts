/**
 * Creator canonical game definition — Stage A of the Creator B2 Canonical Registry migration.
 *
 * Today, a Creator game's metadata lives entirely in `sandbox_games` (D1) — see
 * ports/sandboxGames.ts's `SandboxGameRecord`. The long-term shape this migration is heading
 * toward mirrors how SYSTEM games already split (game-registry/games/<slug>/{info,policy}.json,
 * checked into git — see game-registry/README.md):
 *
 *   OWOGG/USER runtime → generic D1 identity/version + provider-neutral B2 canonical definition
 *   USER control plane → this document remains as review/backfill input
 *
 * D1 keeps everything this document deliberately does NOT carry: game/version identity (the D1
 * row id, never this document), developer identity (ownerUserId — see this file's own note
 * below), review state, the live version pointer, visibility/availability, and attempts/scores.
 * All of that is either relational (foreign-keyed to `users`/`sandbox_game_versions`) or
 * transactional (changes via a review decision, a visibility toggle, a score submission) — not
 * "what the game is", which is the one thing this document exists to describe.
 *
 * This document is retained for USER control-plane compatibility and canonical migration tooling;
 * it is not a runtime registry or publisher-authority source.
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

function optionalBoolean(obj: Record<string, unknown>, field: string): boolean | undefined {
  const value = obj[field];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean")
    fail("INVALID_DOCUMENT", `${field} must be a boolean when present`);
  return value;
}

/** Matches scripts/game-registry-schema.ts's own `optionalPositiveNumber` semantics for the same
 * field family (viewport dimensions) — see this file's own top doc comment on why the two
 * parsers stay independent copies rather than a shared import (Creator's canonical parser must
 * never import from scripts/, which isn't a workspace package core is allowed to depend on, and
 * scripts/ must never import from a wider core surface than the registry-builder helpers it
 * already reuses). */
function optionalPositiveNumber(obj: Record<string, unknown>, field: string): number | undefined {
  const value = obj[field];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    fail("INVALID_DOCUMENT", `${field} must be a positive number when present`);
  }
  return value;
}

/** Rejects unrecognised keys at `context` — v1's `schemaVersion` exists precisely so a typo'd or
 * stray field fails loudly instead of being silently dropped and looking configured when it
 * isn't (same reasoning scripts/game-registry-schema.ts's own `rejectUnknownKeys` documents). */
function rejectUnknownKeys(
  obj: Record<string, unknown>,
  allowed: readonly string[],
  context: string,
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      fail(
        "INVALID_DOCUMENT",
        `${context}: unknown field "${key}" (allowed: ${allowed.join(", ")})`,
      );
    }
  }
}

const TOP_LEVEL_KEYS = [
  "schemaVersion",
  "slug",
  "title",
  "shortDescription",
  "description",
  "genre",
  "mode",
  "policy",
  "presentation",
  "updatedAt",
] as const;
const POLICY_KEYS = ["score", "leaderboard", "xpPerCompletion", "requiresAuth"] as const;
const SCORE_KEYS = ["unit", "direction", "min", "max", "displayPrefix", "displaySuffix"] as const;
const SCORE_DIRECTIONS = ["asc", "desc"] as const;

function parseScoreConfig(value: unknown): ScoreConfig {
  const raw = asRecord(value, "policy.score");
  rejectUnknownKeys(raw, SCORE_KEYS, "policy.score");

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
  rejectUnknownKeys(raw, POLICY_KEYS, "policy");
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

// ── presentation ─────────────────────────────────────────────────────────────
//
// Mirrors scripts/game-registry-schema.ts's own Presentation validation semantics field-for-field
// (mode enum, positive finite dimensions, min<=max, preferred-doesn't-contradict-bounds, fixed
// requires both preferred dimensions, fullscreen's recommended/supported non-contradiction,
// mobile's support/orientation enums, unknown-key rejection at every level) — deliberately a
// second, independent implementation rather than a shared import: this parser must stay
// importable from `packages/core` alone (scripts/ is not a workspace package `@owogg/core` may
// depend on), and scripts/'s own parser must stay free of any Creator-specific concept. Runtime
// validation (positivity, min/max relationships) was always this parser's job per the original
// GamePresentation contract's own design — see that type's doc comment — this just applies the
// same rules Stage A's own review found missing before storing a Creator-authored value.

const VIEWPORT_MODES = ["responsive", "fixed"] as const;
const VIEWPORT_KEYS = [
  "mode",
  "preferredWidth",
  "preferredHeight",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
] as const;
const FULLSCREEN_KEYS = ["supported", "recommended"] as const;
const MOBILE_SUPPORT = ["supported", "experimental", "unsupported"] as const;
const MOBILE_ORIENTATIONS = ["any", "portrait", "landscape"] as const;
const MOBILE_KEYS = ["support", "orientation"] as const;
const PRESENTATION_KEYS = ["viewport", "fullscreen", "mobile"] as const;

function parseViewport(value: unknown): GamePresentation["viewport"] {
  const raw = asRecord(value, "presentation.viewport");
  rejectUnknownKeys(raw, VIEWPORT_KEYS, "presentation.viewport");

  const mode = requireString(raw, "mode");
  if (!(VIEWPORT_MODES as readonly string[]).includes(mode)) {
    fail(
      "INVALID_DOCUMENT",
      `presentation.viewport.mode must be one of ${VIEWPORT_MODES.join(", ")}`,
    );
  }

  const preferredWidth = optionalPositiveNumber(raw, "preferredWidth");
  const preferredHeight = optionalPositiveNumber(raw, "preferredHeight");
  const minWidth = optionalPositiveNumber(raw, "minWidth");
  const minHeight = optionalPositiveNumber(raw, "minHeight");
  const maxWidth = optionalPositiveNumber(raw, "maxWidth");
  const maxHeight = optionalPositiveNumber(raw, "maxHeight");

  if (minWidth !== undefined && maxWidth !== undefined && minWidth > maxWidth) {
    fail("INVALID_DOCUMENT", "presentation.viewport.minWidth must be <= maxWidth");
  }
  if (minHeight !== undefined && maxHeight !== undefined && minHeight > maxHeight) {
    fail("INVALID_DOCUMENT", "presentation.viewport.minHeight must be <= maxHeight");
  }
  if (preferredWidth !== undefined && minWidth !== undefined && preferredWidth < minWidth) {
    fail("INVALID_DOCUMENT", "presentation.viewport.preferredWidth is below minWidth");
  }
  if (preferredWidth !== undefined && maxWidth !== undefined && preferredWidth > maxWidth) {
    fail("INVALID_DOCUMENT", "presentation.viewport.preferredWidth is above maxWidth");
  }
  if (preferredHeight !== undefined && minHeight !== undefined && preferredHeight < minHeight) {
    fail("INVALID_DOCUMENT", "presentation.viewport.preferredHeight is below minHeight");
  }
  if (preferredHeight !== undefined && maxHeight !== undefined && preferredHeight > maxHeight) {
    fail("INVALID_DOCUMENT", "presentation.viewport.preferredHeight is above maxHeight");
  }

  const bounds = {
    ...(minWidth !== undefined ? { minWidth } : {}),
    ...(minHeight !== undefined ? { minHeight } : {}),
    ...(maxWidth !== undefined ? { maxWidth } : {}),
    ...(maxHeight !== undefined ? { maxHeight } : {}),
  };

  if (mode === "fixed") {
    if (preferredWidth === undefined || preferredHeight === undefined) {
      fail(
        "INVALID_DOCUMENT",
        'presentation.viewport: mode "fixed" requires both preferredWidth and preferredHeight',
      );
    }
    return { mode: "fixed", preferredWidth, preferredHeight, ...bounds };
  }

  return {
    mode: "responsive",
    ...(preferredWidth !== undefined ? { preferredWidth } : {}),
    ...(preferredHeight !== undefined ? { preferredHeight } : {}),
    ...bounds,
  };
}

function parseFullscreen(value: unknown): GamePresentation["fullscreen"] {
  const raw = asRecord(value, "presentation.fullscreen");
  rejectUnknownKeys(raw, FULLSCREEN_KEYS, "presentation.fullscreen");

  const supported = requireBoolean(raw, "supported");
  const recommended = optionalBoolean(raw, "recommended");
  if (recommended === true && !supported) {
    fail(
      "INVALID_DOCUMENT",
      "presentation.fullscreen.recommended cannot be true when supported is false",
    );
  }

  return { supported, ...(recommended !== undefined ? { recommended } : {}) };
}

function parseMobile(value: unknown): GamePresentation["mobile"] {
  const raw = asRecord(value, "presentation.mobile");
  rejectUnknownKeys(raw, MOBILE_KEYS, "presentation.mobile");

  const support = requireString(raw, "support");
  if (!(MOBILE_SUPPORT as readonly string[]).includes(support)) {
    fail(
      "INVALID_DOCUMENT",
      `presentation.mobile.support must be one of ${MOBILE_SUPPORT.join(", ")}`,
    );
  }

  const orientation = raw.orientation;
  if (orientation !== undefined) {
    if (
      typeof orientation !== "string" ||
      !(MOBILE_ORIENTATIONS as readonly string[]).includes(orientation)
    ) {
      fail(
        "INVALID_DOCUMENT",
        `presentation.mobile.orientation must be one of ${MOBILE_ORIENTATIONS.join(", ")}`,
      );
    }
  }

  return {
    support: support as GamePresentation["mobile"]["support"],
    ...(typeof orientation === "string"
      ? { orientation: orientation as GamePresentation["mobile"]["orientation"] }
      : {}),
  };
}

function parsePresentation(value: unknown): GamePresentation {
  const raw = asRecord(value, "presentation");
  rejectUnknownKeys(raw, PRESENTATION_KEYS, "presentation");

  if (!("viewport" in raw)) fail("INVALID_DOCUMENT", "presentation.viewport is required");
  if (!("fullscreen" in raw)) fail("INVALID_DOCUMENT", "presentation.fullscreen is required");
  if (!("mobile" in raw)) fail("INVALID_DOCUMENT", "presentation.mobile is required");

  return {
    viewport: parseViewport(raw.viewport),
    fullscreen: parseFullscreen(raw.fullscreen),
    mobile: parseMobile(raw.mobile),
  };
}

const SANDBOX_GAME_MODE_VALUES = ["single", "multi"] as const;

/**
 * Parses and validates a stored canonical document's JSON text against every fail-closed
 * condition Stage A requires: malformed JSON, an unsupported `schemaVersion`, a stored `slug`
 * that doesn't match what the caller actually requested, an unrecognised field at any level
 * (top-level document, `policy`, `policy.score`, `presentation` and each of its three sections),
 * or any other shape that isn't a valid document at all — including a full deep validation of
 * `presentation` (see this file's own "presentation" section above). None of these ever produce a
 * silent empty/default document — every failure throws {@link CreatorGameCanonicalDocumentError},
 * which callers (the B2 adapter) propagate rather than swallow.
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
  rejectUnknownKeys(obj, TOP_LEVEL_KEYS, "document");

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

  const presentation =
    obj.presentation !== undefined ? parsePresentation(obj.presentation) : undefined;

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
