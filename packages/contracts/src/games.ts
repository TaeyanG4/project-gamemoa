import { z } from "zod";
import { SandboxGameModeSchema } from "./sandboxGames.js";

/**
 * The unified public Game read model — `GET /api/games` (catalog) and `GET /api/games/:slug`
 * (detail). Mirrors packages/core/src/modules/game/domain/publicGame.ts's `PublicGame` union
 * field-for-field; see that file's doc comment for why SYSTEM and CREATOR stay two distinct
 * shapes rather than one shape with optional fields on both sides.
 *
 * Compatibility note: this does NOT replace `GET /api/games/sandbox`/`GET /api/games/sandbox/:slug`
 * (SandboxGamePublicDetailSchema below) — both surfaces are served side by side. Nothing currently
 * consuming those routes (apps/web/app/features/catalog/sandboxGameAdapter.ts in particular) has
 * been switched over yet.
 */

// Mirrors @owogg/game-sdk/contracts' GameMode/InputMethod/GameStatus literal unions. Duplicated
// here rather than imported: packages/contracts has no dependency on @owogg/game-sdk (it is meant
// to stay a leaf package with only zod as a dependency — see packages/contracts/package.json),
// and a wire schema's literals are pinned to what actually travels over HTTP regardless of how
// the internal type is defined. Same precedent as SandboxGameModeSchema below, which duplicates
// domain/sandboxGames.ts's SandboxGameMode the same way.
const PublicGameModeSchema = z.enum(["single", "local-multi", "online-multi"]);
const PublicGameInputMethodSchema = z.enum(["mouse", "keyboard", "touch"]);
const PublicGameStatusSchema = z.enum(["draft", "beta", "published", "hidden"]);

export const PublicGameOwnerTypeSchema = z.enum(["SYSTEM", "CREATOR"]);
export type PublicGameOwnerType = z.infer<typeof PublicGameOwnerTypeSchema>;

export const PublicSystemGameSchema = z.object({
  ownerType: z.literal("SYSTEM"),
  slug: z.string(),
  title: z.string(),
  shortDescription: z.string(),
  description: z.string(),
  status: PublicGameStatusSchema,
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  modes: z.array(PublicGameModeSchema),
  inputMethods: z.array(PublicGameInputMethodSchema),
  minPlayers: z.number().int().positive(),
  maxPlayers: z.number().int().positive(),
  thumbnail: z.string(),
  accent: z.string().optional(),
  requiresAuth: z.boolean(),
  supportsLeaderboard: z.boolean(),
});
export type PublicSystemGame = z.infer<typeof PublicSystemGameSchema>;

/** No developerUserId, no review/publish-internal field — same narrowness as
 * SandboxGamePublicDetailSchema below, which this shape is a superset of (adds ownerType,
 * requiresAuth, supportsLeaderboard for symmetry with PublicSystemGameSchema). */
export const PublicCreatorGameSchema = z.object({
  ownerType: z.literal("CREATOR"),
  slug: z.string(),
  title: z.string(),
  shortDescription: z.string().nullable(),
  description: z.string().nullable(),
  genre: z.string(),
  mode: SandboxGameModeSchema,
  hasLogo: z.boolean(),
  requiresAuth: z.boolean(),
  supportsLeaderboard: z.boolean(),
});
export type PublicCreatorGame = z.infer<typeof PublicCreatorGameSchema>;

export const PublicGameSchema = z.discriminatedUnion("ownerType", [
  PublicSystemGameSchema,
  PublicCreatorGameSchema,
]);
export type PublicGame = z.infer<typeof PublicGameSchema>;

/** GET /api/games — SYSTEM games first, then every currently-PUBLIC creator game. See
 * mergePublicGames's doc comment (packages/core) for the ordering rationale. */
export const PublicGameListResponseSchema = z.object({
  games: z.array(PublicGameSchema),
});
export type PublicGameListResponse = z.infer<typeof PublicGameListResponseSchema>;

/**
 * POST /api/games/:slug/session — a short-lived, HMAC-signed Game Session token (see
 * packages/core/src/domain/gameSession.ts). `token` is an opaque string; a client has no reason to
 * parse it, only to hold it and eventually attach it to a future request. `expiresAt` is
 * informational (ISO 8601) — the token is self-describing and self-expiring server-side regardless
 * of whether a caller ever reads this field.
 */
export const GameSessionResponseSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
});
export type GameSessionResponse = z.infer<typeof GameSessionResponseSchema>;

/**
 * POST /api/games/:slug/score — provider-neutral server-side score acceptance. `token` is the Game
 * Session token from GameSessionResponseSchema, spent exactly once by this call. Difficulty is
 * optional on the wire because the signed token is authoritative; when supplied it must match.
 */
export const GameScoreAcceptRequestSchema = z.object({
  token: z.string(),
  score: z.number(),
  difficulty: z.string().optional(),
  /** Separate Discord guild play context; never reaches the iframe or replaces the game token. */
  playToken: z.string().optional(),
});
export type GameScoreAcceptRequest = z.infer<typeof GameScoreAcceptRequestSchema>;

export const GameScoreAcceptResponseSchema = z.object({
  success: z.literal(true),
  score_id: z.number().int().positive().optional(),
  game_id: z.string().optional(),
  score: z.number().optional(),
  nickname: z.string().optional(),
  xpAwarded: z.number().int().min(0).optional(),
  guildXpAwarded: z.number().int().min(0).optional(),
  guildId: z.string().optional(),
  newlyUnlockedAchievements: z.array(z.string()).optional(),
});
export type GameScoreAcceptResponse = z.infer<typeof GameScoreAcceptResponseSchema>;

/** Transitional names retained for CreatorGameHost callers; the endpoint is now generic. */
export const CreatorScoreAcceptRequestSchema = GameScoreAcceptRequestSchema;
export type CreatorScoreAcceptRequest = GameScoreAcceptRequest;
export const CreatorScoreAcceptResponseSchema = GameScoreAcceptResponseSchema;
export type CreatorScoreAcceptResponse = GameScoreAcceptResponse;
