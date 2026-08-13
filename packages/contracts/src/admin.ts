import { z } from "zod";

export const AdminMeResponseSchema = z.object({
  authenticated: z.boolean(),
  admin: z.boolean(),
});
export type AdminMeResponse = z.infer<typeof AdminMeResponseSchema>;

export const AdminOverviewResponseSchema = z.object({
  pendingCreatorReviews: z.number().int().nonnegative(),
  recentAudits: z.array(
    z.object({
      action: z.string(),
      platform: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  discord: z.object({
    interactionsConfigured: z.boolean(),
    activeGuildCount: z.number().int().nonnegative(),
  }),
  creatorProviders: z.record(z.boolean()),
});
export type AdminOverviewResponse = z.infer<typeof AdminOverviewResponseSchema>;

export const AdminPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});
export type AdminPaginationQuery = z.infer<typeof AdminPaginationQuerySchema>;
