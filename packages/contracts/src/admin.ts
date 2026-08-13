import { z } from "zod";

/**
 * `eligible` = ADMIN_USER_IDS root eligibility. `adminAuthenticated` = an active elevated admin
 * session exists (fresh Google step-up + admin username/password already completed).
 * `stepUpRequired` is true whenever an eligible user still needs to complete step-up/login.
 * Never includes ADMIN_USER_IDS/ADMIN_GOOGLE_SUBS/ADMIN_LOGIN_USERNAME/password hash/challenge
 * internals.
 */
export const AdminMeResponseSchema = z.object({
  authenticated: z.boolean(),
  eligible: z.boolean(),
  adminAuthenticated: z.boolean(),
  stepUpRequired: z.boolean(),
});
export type AdminMeResponse = z.infer<typeof AdminMeResponseSchema>;

export const AdminGoogleStepUpRequestSchema = z.object({
  credential: z.string().min(1),
});
export type AdminGoogleStepUpRequest = z.infer<typeof AdminGoogleStepUpRequestSchema>;

export const AdminGoogleStepUpResponseSchema = z.object({
  stepUpVerified: z.boolean(),
});
export type AdminGoogleStepUpResponse = z.infer<typeof AdminGoogleStepUpResponseSchema>;

export const AdminLoginRequestSchema = z.object({
  username: z.string().min(1).max(200),
  password: z.string().min(1).max(500),
});
export type AdminLoginRequest = z.infer<typeof AdminLoginRequestSchema>;

export const AdminLoginResponseSchema = z.object({
  adminAuthenticated: z.boolean(),
});
export type AdminLoginResponse = z.infer<typeof AdminLoginResponseSchema>;

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
