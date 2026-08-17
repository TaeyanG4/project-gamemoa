import { z } from "zod";

/** External-developer sandbox game contracts — see docs/GAME_CREATION_GUIDE.md §3 and
 * packages/db/migrations/0024_sandbox_games.sql. Review (per-version) and visibility (per-game)
 * are independent axes: approving a version never makes a game PUBLIC by itself. */

export const SandboxGameVisibilitySchema = z.enum(["PRIVATE", "PUBLIC"]);
export type SandboxGameVisibility = z.infer<typeof SandboxGameVisibilitySchema>;

export const SandboxGameVersionStatusSchema = z.enum([
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
]);
export type SandboxGameVersionStatus = z.infer<typeof SandboxGameVersionStatusSchema>;

export const SandboxGameRecordSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string(),
  developerUserId: z.number().int().positive(),
  title: z.string(),
  shortDescription: z.string().nullable(),
  description: z.string().nullable(),
  genre: z.string(),
  xpPerCompletion: z.number().int().nonnegative(),
  scoreUnit: z.string().nullable(),
  scoreDirection: z.enum(["asc", "desc"]).nullable(),
  scoreMin: z.number().nullable(),
  scoreMax: z.number().nullable(),
  scoreDisplayPrefix: z.string().nullable(),
  scoreDisplaySuffix: z.string().nullable(),
  visibility: SandboxGameVisibilitySchema,
  liveVersionId: z.number().int().nullable(),
  /** Beta concurrent-submission quota slot (1 or 2) — non-null while this game is still awaiting
   * its first review decision. A client can derive "N/2 슬롯 사용 중" for its own games by counting
   * entries with a non-null reviewSlot in the response of GET /api/dev/games. */
  reviewSlot: z.union([z.literal(1), z.literal(2)]).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SandboxGameRecord = z.infer<typeof SandboxGameRecordSchema>;

export const SandboxGamePublishStatusSchema = z.enum(["UPLOADED", "PUBLISHING", "READY", "FAILED"]);
export type SandboxGamePublishStatus = z.infer<typeof SandboxGamePublishStatusSchema>;

/** Note what is absent: `objectKey`/`manifestKey`. Storage keys are internal — a client is told
 * *whether* a version is published, never where its bytes live. */
export const SandboxGameVersionRecordSchema = z.object({
  id: z.number().int().positive(),
  gameId: z.number().int().positive(),
  contentHash: z.string(),
  bundleBytes: z.number().int().nonnegative(),
  status: SandboxGameVersionStatusSchema,
  reviewedByAdminId: z.number().int().nullable(),
  reviewedAt: z.string().nullable(),
  rejectReason: z.string().nullable(),
  uploadedAt: z.string(),
  /** Publish axis — independent of `status`. Only READY versions are servable or promotable. */
  publishStatus: SandboxGamePublishStatusSchema,
  publishError: z.string().nullable(),
  publishedAt: z.string().nullable(),
  publishedSizeBytes: z.number().int().nonnegative().nullable(),
  fileCount: z.number().int().nonnegative().nullable(),
});
export type SandboxGameVersionRecord = z.infer<typeof SandboxGameVersionRecordSchema>;

export const SandboxGameReviewAuditEntrySchema = z.object({
  id: z.number().int(),
  gameId: z.number().int(),
  versionId: z.number().int().nullable(),
  actorAdminId: z.number().int(),
  action: z.string(),
  reason: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
});
export type SandboxGameReviewAuditEntry = z.infer<typeof SandboxGameReviewAuditEntrySchema>;

// ── Developer-facing ──

export const SandboxGameCreateRequestSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "영문 소문자/숫자/- 조합만 가능합니다."),
  title: z.string().trim().min(1).max(60),
  shortDescription: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  genre: z.string().trim().min(1).max(40),
});
export type SandboxGameCreateRequest = z.infer<typeof SandboxGameCreateRequestSchema>;

export const SandboxGameListResponseSchema = z.object({
  games: z.array(SandboxGameRecordSchema),
});
export type SandboxGameListResponse = z.infer<typeof SandboxGameListResponseSchema>;

// ── Public-facing (anonymous, no auth) ──

/** Deliberately a narrow subset of SandboxGameRecord — an anonymous player never needs
 * developerUserId, reviewSlot, or any review/publish-internal field. Only ever returned for a
 * game that is currently PUBLIC with a live version (see GET /api/games/sandbox/:slug), so its
 * mere presence in a response already implies "this is live to play". */
export const SandboxGamePublicDetailSchema = z.object({
  slug: z.string(),
  title: z.string(),
  shortDescription: z.string().nullable(),
  description: z.string().nullable(),
  genre: z.string(),
});
export type SandboxGamePublicDetail = z.infer<typeof SandboxGamePublicDetailSchema>;

export const SandboxGameDetailResponseSchema = z.object({
  game: SandboxGameRecordSchema,
  versions: z.array(SandboxGameVersionRecordSchema),
  auditLog: z.array(SandboxGameReviewAuditEntrySchema),
});
export type SandboxGameDetailResponse = z.infer<typeof SandboxGameDetailResponseSchema>;

// ── Admin-facing ──

/** One row in the admin review queue — the version plus just enough of its parent game to
 * render without a second round-trip per row. */
export const SandboxGameReviewQueueEntrySchema = z.object({
  version: SandboxGameVersionRecordSchema,
  gameId: z.number().int().positive(),
  gameSlug: z.string(),
  gameTitle: z.string(),
  developerUserId: z.number().int().positive(),
});
export type SandboxGameReviewQueueEntry = z.infer<typeof SandboxGameReviewQueueEntrySchema>;

export const SandboxGameReviewQueueQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type SandboxGameReviewQueueQuery = z.infer<typeof SandboxGameReviewQueueQuerySchema>;

export const SandboxGameReviewQueueResponseSchema = z.object({
  entries: z.array(SandboxGameReviewQueueEntrySchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type SandboxGameReviewQueueResponse = z.infer<typeof SandboxGameReviewQueueResponseSchema>;

export const SandboxGameVersionDecisionRequestSchema = z.object({
  reason: z.string().trim().max(1000).nullable().optional(),
});
export type SandboxGameVersionDecisionRequest = z.infer<
  typeof SandboxGameVersionDecisionRequestSchema
>;

export const SandboxGameMetadataUpdateRequestSchema = z.object({
  title: z.string().trim().min(1).max(60).optional(),
  shortDescription: z.string().trim().max(200).nullable().optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  genre: z.string().trim().min(1).max(40).optional(),
  xpPerCompletion: z.number().int().min(0).max(100_000).optional(),
  scoreUnit: z.string().trim().max(20).nullable().optional(),
  scoreDirection: z.enum(["asc", "desc"]).nullable().optional(),
  scoreMin: z.number().nullable().optional(),
  scoreMax: z.number().nullable().optional(),
  scoreDisplayPrefix: z.string().trim().max(20).nullable().optional(),
  scoreDisplaySuffix: z.string().trim().max(20).nullable().optional(),
});
export type SandboxGameMetadataUpdateRequest = z.infer<
  typeof SandboxGameMetadataUpdateRequestSchema
>;

export const SandboxGameVisibilityUpdateRequestSchema = z.object({
  visibility: SandboxGameVisibilitySchema,
});
export type SandboxGameVisibilityUpdateRequest = z.infer<
  typeof SandboxGameVisibilityUpdateRequestSchema
>;

/** Rollback / roll-forward: point the game at a different approved+published version. */
export const SandboxGameLiveVersionUpdateRequestSchema = z.object({
  versionId: z.number().int().positive(),
});
export type SandboxGameLiveVersionUpdateRequest = z.infer<
  typeof SandboxGameLiveVersionUpdateRequestSchema
>;
