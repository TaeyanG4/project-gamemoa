/**
 * Validates and parses `game-registry/games/<slug>/{info,policy}.json` into a `GameDefinition`.
 *
 * This file *is* the schema — there is no separate JSON Schema document to drift out of sync with
 * it. Written by hand rather than with a validation library on purpose: it matches the existing
 * style of scripts/registry-builder.ts, it adds no dependency to a root script that currently has
 * none, and it can name the exact file and field a human should go fix, which is the whole job
 * when the input is a data directory people edit by hand.
 *
 * Every parse failure throws with a `game-registry/games/<slug>/<file>: <field> ...` prefix. The
 * builder does not catch these — a malformed registry must fail the build loudly rather than
 * generate a subtly wrong catalog.
 */

import type {
  DifficultyConfig,
  GameMode,
  GameStatus,
  InputMethod,
  ScoreConfig,
} from "../packages/game-sdk/src/contracts/manifest.js";
import type {
  GamePresentation,
  GamePresentationFullscreen,
  GamePresentationMobile,
  GamePresentationViewport,
} from "../packages/game-sdk/src/contracts/presentation.js";
import type {
  GamePolicy,
  SystemGameDefinition,
} from "../packages/core/src/modules/game/domain/gameDefinition.js";
import type { SystemGameOwner } from "../packages/core/src/modules/game/domain/gameOwner.js";

const GAME_MODES: readonly GameMode[] = ["single", "local-multi", "online-multi"];
const GAME_STATUSES: readonly GameStatus[] = ["draft", "beta", "published", "hidden"];
const INPUT_METHODS: readonly InputMethod[] = ["mouse", "keyboard", "touch"];
const SCORE_DIRECTIONS = ["asc", "desc"] as const;

/**
 * Same rule as a creator-submitted slug (`isValidSandboxGameSlug`, packages/core). Official games
 * are held to it too so that one registry can guarantee global uniqueness over a single namespace
 * rather than reconciling two different notions of a valid name.
 */
const SLUG_PATTERN = /^[a-z0-9-]+$/;
const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 64;

export class GameRegistryValidationError extends Error {}

interface FieldContext {
  /** e.g. `game-registry/games/aim-test/info.json` — always shown to the person fixing it. */
  file: string;
}

function fail(ctx: FieldContext, message: string): never {
  throw new GameRegistryValidationError(`${ctx.file}: ${message}`);
}

function asRecord(ctx: FieldContext, value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(ctx, "must be a JSON object");
  }
  return value as Record<string, unknown>;
}

function requireString(ctx: FieldContext, obj: Record<string, unknown>, field: string): string {
  const value = obj[field];
  if (typeof value !== "string") fail(ctx, `${field} is required and must be a string`);
  return value;
}

function optionalString(
  ctx: FieldContext,
  obj: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = obj[field];
  if (value === undefined) return undefined;
  if (typeof value !== "string") fail(ctx, `${field} must be a string when present`);
  return value;
}

function requireInteger(ctx: FieldContext, obj: Record<string, unknown>, field: string): number {
  const value = obj[field];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail(ctx, `${field} is required and must be an integer`);
  }
  return value;
}

function optionalInteger(
  ctx: FieldContext,
  obj: Record<string, unknown>,
  field: string,
): number | undefined {
  const value = obj[field];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value)) {
    fail(ctx, `${field} must be an integer when present`);
  }
  return value;
}

function requireBoolean(ctx: FieldContext, obj: Record<string, unknown>, field: string): boolean {
  const value = obj[field];
  if (typeof value !== "boolean") fail(ctx, `${field} is required and must be a boolean`);
  return value;
}

function optionalBoolean(
  ctx: FieldContext,
  obj: Record<string, unknown>,
  field: string,
): boolean | undefined {
  const value = obj[field];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") fail(ctx, `${field} must be a boolean when present`);
  return value;
}

/** Viewport dimensions are pixel sizes — finite and > 0, not necessarily integers (matching
 * GamePresentationViewport's `number` fields, which don't restrict to integers either). */
function optionalPositiveNumber(
  ctx: FieldContext,
  obj: Record<string, unknown>,
  field: string,
): number | undefined {
  const value = obj[field];
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    fail(ctx, `${field} must be a positive number when present`);
  }
  return value;
}

function requireStringArray(
  ctx: FieldContext,
  obj: Record<string, unknown>,
  field: string,
): string[] {
  const value = obj[field];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    fail(ctx, `${field} is required and must be an array of strings`);
  }
  return value as string[];
}

function requireEnumArray<T extends string>(
  ctx: FieldContext,
  obj: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
): T[] {
  const values = requireStringArray(ctx, obj, field);
  if (values.length === 0) fail(ctx, `${field} must list at least one value`);
  for (const value of values) {
    if (!(allowed as readonly string[]).includes(value)) {
      fail(ctx, `${field} contains unknown value "${value}" (allowed: ${allowed.join(", ")})`);
    }
  }
  return values as T[];
}

/** Rejects unrecognised keys. A typo'd field that silently does nothing is worse than a build
 * failure — it looks configured and isn't. */
function rejectUnknownKeys(
  ctx: FieldContext,
  obj: Record<string, unknown>,
  known: readonly string[],
): void {
  for (const key of Object.keys(obj)) {
    if (!known.includes(key)) {
      fail(ctx, `unknown field "${key}" (allowed: ${known.join(", ")})`);
    }
  }
}

export function validateSlug(ctx: FieldContext, slug: string): string {
  if (slug.length < MIN_SLUG_LENGTH || slug.length > MAX_SLUG_LENGTH) {
    fail(ctx, `slug must be ${MIN_SLUG_LENGTH}-${MAX_SLUG_LENGTH} characters (got "${slug}")`);
  }
  if (!SLUG_PATTERN.test(slug)) {
    fail(ctx, `slug must match ${SLUG_PATTERN} (got "${slug}")`);
  }
  return slug;
}

const DIFFICULTY_KEYS = ["levels", "defaultLevelId"] as const;
const DIFFICULTY_LEVEL_KEYS = ["id", "label"] as const;

function parseDifficulty(ctx: FieldContext, value: unknown): DifficultyConfig {
  const raw = asRecord({ file: `${ctx.file} difficulty` }, value);
  rejectUnknownKeys({ file: `${ctx.file} difficulty` }, raw, DIFFICULTY_KEYS);

  const rawLevels = raw.levels;
  if (!Array.isArray(rawLevels) || rawLevels.length === 0) {
    fail(ctx, "difficulty.levels must be a non-empty array");
  }

  const levels = rawLevels.map((entry, index) => {
    const levelCtx = { file: `${ctx.file} difficulty.levels[${index}]` };
    const level = asRecord(levelCtx, entry);
    rejectUnknownKeys(levelCtx, level, DIFFICULTY_LEVEL_KEYS);
    return {
      id: requireString(levelCtx, level, "id"),
      label: requireString(levelCtx, level, "label"),
    };
  });

  const ids = levels.map((level) => level.id);
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) fail(ctx, `difficulty.levels has a duplicate id "${duplicate}"`);

  const defaultLevelId = requireString(ctx, raw, "defaultLevelId");
  if (!ids.includes(defaultLevelId)) {
    fail(ctx, `difficulty.defaultLevelId "${defaultLevelId}" is not one of ${ids.join(", ")}`);
  }

  return { levels, defaultLevelId };
}

const SCORE_KEYS = ["unit", "direction", "min", "max", "displayPrefix", "displaySuffix"] as const;

function parseScore(ctx: FieldContext, value: unknown): ScoreConfig {
  const scoreCtx = { file: `${ctx.file} score` };
  const raw = asRecord(scoreCtx, value);
  rejectUnknownKeys(scoreCtx, raw, SCORE_KEYS);

  const direction = requireString(scoreCtx, raw, "direction");
  if (!(SCORE_DIRECTIONS as readonly string[]).includes(direction)) {
    fail(scoreCtx, `direction must be one of ${SCORE_DIRECTIONS.join(", ")} (got "${direction}")`);
  }

  const min = requireInteger(scoreCtx, raw, "min");
  const max = requireInteger(scoreCtx, raw, "max");
  // A submitted score is checked against this range, so an inverted or empty one would reject
  // every score the game can produce — a silent, total outage for that leaderboard.
  if (min >= max) fail(scoreCtx, `min (${min}) must be less than max (${max})`);

  const displayPrefix = optionalString(scoreCtx, raw, "displayPrefix");
  const displaySuffix = optionalString(scoreCtx, raw, "displaySuffix");

  return {
    unit: requireString(scoreCtx, raw, "unit"),
    direction: direction as ScoreConfig["direction"],
    min,
    max,
    ...(displayPrefix !== undefined ? { displayPrefix } : {}),
    ...(displaySuffix !== undefined ? { displaySuffix } : {}),
  };
}

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

/**
 * See GamePresentationViewport's own doc comment (packages/game-sdk/src/contracts/presentation.ts)
 * for what each field means. This is the runtime half of the invariant that type only enforces at
 * the literal call site: `mode: "fixed"` requires both preferredWidth and preferredHeight here too,
 * plus the min/max relationships and preferred-doesn't-contradict-bounds checks the type can't
 * express at all. Positivity and min<=max are checked; arbitrary platform maximums (e.g. 4096) are
 * deliberately not — no such ceiling exists yet.
 */
function parseViewport(ctx: FieldContext, value: unknown): GamePresentationViewport {
  const viewportCtx = { file: `${ctx.file} presentation.viewport` };
  const raw = asRecord(viewportCtx, value);
  rejectUnknownKeys(viewportCtx, raw, VIEWPORT_KEYS);

  const mode = requireString(viewportCtx, raw, "mode");
  if (!(VIEWPORT_MODES as readonly string[]).includes(mode)) {
    fail(viewportCtx, `mode must be one of ${VIEWPORT_MODES.join(", ")} (got "${mode}")`);
  }

  const preferredWidth = optionalPositiveNumber(viewportCtx, raw, "preferredWidth");
  const preferredHeight = optionalPositiveNumber(viewportCtx, raw, "preferredHeight");
  const minWidth = optionalPositiveNumber(viewportCtx, raw, "minWidth");
  const minHeight = optionalPositiveNumber(viewportCtx, raw, "minHeight");
  const maxWidth = optionalPositiveNumber(viewportCtx, raw, "maxWidth");
  const maxHeight = optionalPositiveNumber(viewportCtx, raw, "maxHeight");

  if (minWidth !== undefined && maxWidth !== undefined && minWidth > maxWidth) {
    fail(viewportCtx, `minWidth (${minWidth}) must be <= maxWidth (${maxWidth})`);
  }
  if (minHeight !== undefined && maxHeight !== undefined && minHeight > maxHeight) {
    fail(viewportCtx, `minHeight (${minHeight}) must be <= maxHeight (${maxHeight})`);
  }
  if (preferredWidth !== undefined && minWidth !== undefined && preferredWidth < minWidth) {
    fail(viewportCtx, `preferredWidth (${preferredWidth}) is below minWidth (${minWidth})`);
  }
  if (preferredWidth !== undefined && maxWidth !== undefined && preferredWidth > maxWidth) {
    fail(viewportCtx, `preferredWidth (${preferredWidth}) is above maxWidth (${maxWidth})`);
  }
  if (preferredHeight !== undefined && minHeight !== undefined && preferredHeight < minHeight) {
    fail(viewportCtx, `preferredHeight (${preferredHeight}) is below minHeight (${minHeight})`);
  }
  if (preferredHeight !== undefined && maxHeight !== undefined && preferredHeight > maxHeight) {
    fail(viewportCtx, `preferredHeight (${preferredHeight}) is above maxHeight (${maxHeight})`);
  }

  const bounds = {
    ...(minWidth !== undefined ? { minWidth } : {}),
    ...(minHeight !== undefined ? { minHeight } : {}),
    ...(maxWidth !== undefined ? { maxWidth } : {}),
    ...(maxHeight !== undefined ? { maxHeight } : {}),
  };

  if (mode === "fixed") {
    // The type-level invariant (GamePresentationFixedViewport) already requires both fields at
    // any TypeScript call site; this is the same requirement enforced against untyped JSON.
    if (preferredWidth === undefined || preferredHeight === undefined) {
      fail(viewportCtx, `mode "fixed" requires both preferredWidth and preferredHeight`);
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

function parseFullscreen(ctx: FieldContext, value: unknown): GamePresentationFullscreen {
  const fsCtx = { file: `${ctx.file} presentation.fullscreen` };
  const raw = asRecord(fsCtx, value);
  rejectUnknownKeys(fsCtx, raw, FULLSCREEN_KEYS);

  const supported = requireBoolean(fsCtx, raw, "supported");
  const recommended = optionalBoolean(fsCtx, raw, "recommended");
  if (recommended === true && !supported) {
    fail(fsCtx, `recommended cannot be true when supported is false`);
  }

  return {
    supported,
    ...(recommended !== undefined ? { recommended } : {}),
  };
}

function parseMobile(ctx: FieldContext, value: unknown): GamePresentationMobile {
  const mobileCtx = { file: `${ctx.file} presentation.mobile` };
  const raw = asRecord(mobileCtx, value);
  rejectUnknownKeys(mobileCtx, raw, MOBILE_KEYS);

  const support = requireString(mobileCtx, raw, "support");
  if (!(MOBILE_SUPPORT as readonly string[]).includes(support)) {
    fail(mobileCtx, `support must be one of ${MOBILE_SUPPORT.join(", ")} (got "${support}")`);
  }

  const orientation = optionalString(mobileCtx, raw, "orientation");
  if (
    orientation !== undefined &&
    !(MOBILE_ORIENTATIONS as readonly string[]).includes(orientation)
  ) {
    fail(
      mobileCtx,
      `orientation must be one of ${MOBILE_ORIENTATIONS.join(", ")} (got "${orientation}")`,
    );
  }

  return {
    support: support as GamePresentationMobile["support"],
    ...(orientation !== undefined
      ? { orientation: orientation as GamePresentationMobile["orientation"] }
      : {}),
  };
}

/** `presentation` is entirely optional — omitted, a GameDefinition behaves exactly as it always
 * has (see GamePresentation's own doc comment). Present, all three of viewport/fullscreen/mobile
 * are required, matching the type: there is no such thing as a presentation with only some of its
 * sections declared. */
function parsePresentation(ctx: FieldContext, value: unknown): GamePresentation {
  const presCtx = { file: `${ctx.file} presentation` };
  const raw = asRecord(presCtx, value);
  rejectUnknownKeys(presCtx, raw, PRESENTATION_KEYS);

  if (!("viewport" in raw)) fail(presCtx, "viewport is required");
  if (!("fullscreen" in raw)) fail(presCtx, "fullscreen is required");
  if (!("mobile" in raw)) fail(presCtx, "mobile is required");

  return {
    viewport: parseViewport(ctx, raw.viewport),
    fullscreen: parseFullscreen(ctx, raw.fullscreen),
    mobile: parseMobile(ctx, raw.mobile),
  };
}

const INFO_KEYS = [
  "slug",
  "title",
  "shortDescription",
  "description",
  "status",
  "categories",
  "tags",
  "modes",
  "inputMethods",
  "minPlayers",
  "maxPlayers",
  "thumbnail",
  "accent",
  "estimatedRoundSeconds",
  "supportsReplay",
  "difficulty",
  "presentation",
] as const;

const POLICY_KEYS = ["score", "leaderboard", "xpPerCompletion", "requiresAuth"] as const;

/** Highest XP a single completion may be worth. Not a product ceiling so much as a typo guard:
 * XP is irreversible once granted (see docs/GAME_CREATION_GUIDE.md §3.5), so a stray extra zero
 * must fail the build rather than inflate the economy. */
const MAX_XP_PER_COMPLETION = 100_000;

export function parseGamePolicy(file: string, raw: unknown): GamePolicy {
  const ctx = { file };
  const obj = asRecord(ctx, raw);
  rejectUnknownKeys(ctx, obj, POLICY_KEYS);

  const xpPerCompletion = requireInteger(ctx, obj, "xpPerCompletion");
  if (xpPerCompletion < 0 || xpPerCompletion > MAX_XP_PER_COMPLETION) {
    fail(ctx, `xpPerCompletion must be between 0 and ${MAX_XP_PER_COMPLETION}`);
  }

  // `null` is meaningful and distinct from omitted: it says "this game is deliberately not
  // scored", which the schema requires you to state rather than leave implied.
  if (!("score" in obj)) fail(ctx, "score is required (use null for an unscored game)");
  const score = obj.score === null ? null : parseScore(ctx, obj.score);

  const policy: GamePolicy = {
    score,
    leaderboard: requireBoolean(ctx, obj, "leaderboard"),
    xpPerCompletion,
    requiresAuth: requireBoolean(ctx, obj, "requiresAuth"),
  };

  if (policy.leaderboard && policy.score === null) {
    fail(ctx, "leaderboard is true but score is null — there would be nothing to rank");
  }

  return policy;
}

/**
 * Builds a complete {@link SystemGameDefinition} from one game's two files. `owner` is supplied by
 * the caller rather than read from the data: this directory holds SYSTEM games only, and letting a
 * data file declare its own owner is exactly the kind of thing a creator-supplied file must never
 * be able to do. Typed as `SystemGameOwner`, not the general `GameOwner`, for the same reason —
 * this function only ever builds a SYSTEM definition.
 */
export function parseGameDefinition(input: {
  slug: string;
  infoFile: string;
  policyFile: string;
  info: unknown;
  policy: unknown;
  owner: SystemGameOwner;
}): SystemGameDefinition {
  const ctx = { file: input.infoFile };
  const obj = asRecord(ctx, input.info);
  rejectUnknownKeys(ctx, obj, INFO_KEYS);

  const slug = validateSlug(ctx, requireString(ctx, obj, "slug"));
  if (slug !== input.slug) {
    fail(ctx, `slug "${slug}" does not match its directory name "${input.slug}"`);
  }

  const status = requireString(ctx, obj, "status");
  if (!(GAME_STATUSES as readonly string[]).includes(status)) {
    fail(ctx, `status must be one of ${GAME_STATUSES.join(", ")} (got "${status}")`);
  }

  const minPlayers = requireInteger(ctx, obj, "minPlayers");
  const maxPlayers = requireInteger(ctx, obj, "maxPlayers");
  if (minPlayers < 1) fail(ctx, `minPlayers must be at least 1 (got ${minPlayers})`);
  if (maxPlayers < minPlayers) {
    fail(ctx, `maxPlayers (${maxPlayers}) must be >= minPlayers (${minPlayers})`);
  }

  const accent = optionalString(ctx, obj, "accent");
  const estimatedRoundSeconds = optionalInteger(ctx, obj, "estimatedRoundSeconds");
  const difficulty =
    obj.difficulty === undefined ? undefined : parseDifficulty(ctx, obj.difficulty);
  const presentation =
    obj.presentation === undefined ? undefined : parsePresentation(ctx, obj.presentation);

  return {
    slug,
    owner: input.owner,
    title: requireString(ctx, obj, "title"),
    shortDescription: requireString(ctx, obj, "shortDescription"),
    description: requireString(ctx, obj, "description"),
    status: status as GameStatus,
    categories: requireStringArray(ctx, obj, "categories"),
    tags: requireStringArray(ctx, obj, "tags"),
    modes: requireEnumArray(ctx, obj, "modes", GAME_MODES),
    inputMethods: requireEnumArray(ctx, obj, "inputMethods", INPUT_METHODS),
    minPlayers,
    maxPlayers,
    thumbnail: requireString(ctx, obj, "thumbnail"),
    ...(accent !== undefined ? { accent } : {}),
    ...(estimatedRoundSeconds !== undefined ? { estimatedRoundSeconds } : {}),
    ...(difficulty !== undefined ? { difficulty } : {}),
    supportsReplay: requireBoolean(ctx, obj, "supportsReplay"),
    ...(presentation !== undefined ? { presentation } : {}),
    policy: parseGamePolicy(input.policyFile, input.policy),
  };
}
