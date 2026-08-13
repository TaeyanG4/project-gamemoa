import { z } from "zod";
import {
  CreatorPlatformAccountDtoSchema,
  CreatorPlatformSchema,
  FeaturedStatusSchema,
  CreatorStatusSchema,
} from "./creator.js";

export const CreatorManualReviewActionSchema = z.enum([
  "APPROVE_FEATURED",
  "REJECT_FEATURED",
  "KEEP_FOR_REVIEW",
]);
export type CreatorManualReviewAction = z.infer<typeof CreatorManualReviewActionSchema>;

export const CreatorManualReviewActionRequestSchema = z
  .object({
    action: CreatorManualReviewActionSchema,
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();
export type CreatorManualReviewActionRequest = z.infer<
  typeof CreatorManualReviewActionRequestSchema
>;

export const CreatorManualReviewJobDtoSchema = z.object({
  id: z.number(),
  creatorPlatformAccountId: z.number(),
  reviewType: z.enum(["ACQUISITION", "REVALIDATION"]),
  status: z.enum([
    "AUTO_REVIEW_PENDING",
    "FEATURED",
    "NOT_ELIGIBLE",
    "MANUAL_REVIEW",
    "FAILED_RETRYABLE",
    "REVALIDATION_PENDING",
    "REVALIDATION_FAILED_RETRYABLE",
  ]),
  initialAudience: z.number().nullable(),
  initialChannelCreatedAt: z.string().nullable(),
  nextCheckAt: z.string(),
  attemptCount: z.number(),
  reviewReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
});

export const CreatorManualReviewItemDtoSchema = z.object({
  job: CreatorManualReviewJobDtoSchema,
  userId: z.number(),
  nickname: z.string(),
  creatorId: z.number(),
  creatorStatus: CreatorStatusSchema,
  featuredStatus: FeaturedStatusSchema,
  platformAccount: CreatorPlatformAccountDtoSchema,
});
export type CreatorManualReviewItemDto = z.infer<typeof CreatorManualReviewItemDtoSchema>;

export const CreatorReviewAuditMetricSnapshotSchema = z.object({
  platform: CreatorPlatformSchema,
  channelName: z.string(),
  channelUrl: z.string(),
  verificationStatus: z.string(),
  audienceCount: z.number().nullable(),
  channelCreatedAt: z.string().nullable(),
  metricsSyncedAt: z.string().nullable(),
});

export const CreatorReviewAuditLogDtoSchema = z.object({
  id: z.number(),
  creatorPlatformAccountId: z.number(),
  reviewJobId: z.number().nullable(),
  reviewerUserId: z.number(),
  action: CreatorManualReviewActionSchema,
  reason: z.string(),
  previousStatus: z.string(),
  newStatus: z.string(),
  metricSnapshot: CreatorReviewAuditMetricSnapshotSchema.nullable(),
  createdAt: z.string(),
  platform: CreatorPlatformSchema.nullable(),
  channelName: z.string().nullable(),
});
export type CreatorReviewAuditLogDto = z.infer<typeof CreatorReviewAuditLogDtoSchema>;

export const CreatorManualReviewQueueResponseSchema = z.object({
  items: z.array(CreatorManualReviewItemDtoSchema),
  total: z.number(),
  audits: z.object({
    entries: z.array(CreatorReviewAuditLogDtoSchema),
    total: z.number(),
  }),
});
export type CreatorManualReviewQueueResponse = z.infer<
  typeof CreatorManualReviewQueueResponseSchema
>;

export const CreatorManualReviewActionResponseSchema = z.object({
  applied: z.boolean(),
  action: CreatorManualReviewActionSchema,
  previousStatus: z.string().nullable(),
  newStatus: z.string().nullable(),
});
export type CreatorManualReviewActionResponse = z.infer<
  typeof CreatorManualReviewActionResponseSchema
>;
