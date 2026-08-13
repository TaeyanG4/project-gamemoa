import { z } from "zod";

/**
 * `eligible` = ADMIN_USER_IDS root eligibility OR an active managed admin_accounts row.
 * `adminAuthenticated` = an active elevated admin session exists (fresh Google step-up + admin
 * username/password already completed). `stepUpRequired` is true whenever an eligible user still
 * needs to complete step-up/login. `bootstrapAvailable` is true when the eligible user has
 * completed step-up but no administrator account exists yet anywhere — the client should show
 * the one-time first-admin setup form instead of a login form. `mustChangePassword` is true once
 * logged in with a managed account still carrying a forced password change. Never includes
 * ADMIN_USER_IDS/ADMIN_GOOGLE_SUBS/ADMIN_LOGIN_USERNAME/password hash/challenge internals.
 */
export const AdminMeResponseSchema = z.object({
  authenticated: z.boolean(),
  eligible: z.boolean(),
  adminAuthenticated: z.boolean(),
  stepUpRequired: z.boolean(),
  bootstrapAvailable: z.boolean(),
  mustChangePassword: z.boolean(),
  role: z.enum(["SUPERADMIN", "ADMIN"]).nullable(),
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
  mustChangePassword: z.boolean(),
});
export type AdminLoginResponse = z.infer<typeof AdminLoginResponseSchema>;

// ---------------------------------------------------------------------------
// Managed administrator accounts (D1) — bootstrap, password change, account management
// ---------------------------------------------------------------------------

const ADMIN_USERNAME_SCHEMA = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-zA-Z0-9_.-]+$/, "영문/숫자/._- 조합만 가능합니다.");
const ADMIN_NEW_PASSWORD_SCHEMA = z.string().min(12).max(200);

export const AdminAccountRoleSchema = z.enum(["SUPERADMIN", "ADMIN"]);
export type AdminAccountRoleValue = z.infer<typeof AdminAccountRoleSchema>;

export const AdminAccountStatusSchema = z.enum(["ACTIVE", "DISABLED"]);
export type AdminAccountStatusValue = z.infer<typeof AdminAccountStatusSchema>;

/** First-admin bootstrap — only reachable while zero administrator accounts exist anywhere and
 * only after a fresh Google step-up bound to the current OwOGG account. */
export const AdminBootstrapRequestSchema = z
  .object({
    username: ADMIN_USERNAME_SCHEMA,
    password: ADMIN_NEW_PASSWORD_SCHEMA,
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });
export type AdminBootstrapRequest = z.infer<typeof AdminBootstrapRequestSchema>;

export const AdminBootstrapResponseSchema = z.object({
  adminAuthenticated: z.boolean(),
  mustChangePassword: z.boolean(),
});
export type AdminBootstrapResponse = z.infer<typeof AdminBootstrapResponseSchema>;

/** Self password change — requires the current elevated admin session and the current password. */
export const AdminPasswordChangeRequestSchema = z
  .object({
    currentPassword: z.string().min(1).max(500),
    newPassword: ADMIN_NEW_PASSWORD_SCHEMA,
    newPasswordConfirm: z.string(),
  })
  .refine((v) => v.newPassword === v.newPasswordConfirm, {
    message: "새 비밀번호가 일치하지 않습니다.",
    path: ["newPasswordConfirm"],
  });
export type AdminPasswordChangeRequest = z.infer<typeof AdminPasswordChangeRequestSchema>;

export const AdminPasswordChangeResponseSchema = z.object({ success: z.boolean() });
export type AdminPasswordChangeResponse = z.infer<typeof AdminPasswordChangeResponseSchema>;

/** Safe administrator account summary — never includes password_hash or google_sub. */
export const AdminAccountSummarySchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  nickname: z.string(),
  username: z.string(),
  role: AdminAccountRoleSchema,
  status: AdminAccountStatusSchema,
  mustChangePassword: z.boolean(),
  createdAt: z.string(),
  passwordChangedAt: z.string(),
  isSelf: z.boolean(),
});
export type AdminAccountSummary = z.infer<typeof AdminAccountSummarySchema>;

export const AdminAccountListResponseSchema = z.object({
  accounts: z.array(AdminAccountSummarySchema),
});
export type AdminAccountListResponse = z.infer<typeof AdminAccountListResponseSchema>;

/** SUPERADMIN-only: creates another administrator bound to an existing OwOGG user whose Google
 * identity is derived server-side from that user's already-linked oauth_accounts row — never
 * accepted as free-text input here. */
export const AdminAccountCreateRequestSchema = z.object({
  userId: z.number().int().positive(),
  username: ADMIN_USERNAME_SCHEMA,
  password: ADMIN_NEW_PASSWORD_SCHEMA,
  role: AdminAccountRoleSchema,
});
export type AdminAccountCreateRequest = z.infer<typeof AdminAccountCreateRequestSchema>;

export const AdminAccountStatusChangeRequestSchema = z.object({ status: AdminAccountStatusSchema });
export type AdminAccountStatusChangeRequest = z.infer<typeof AdminAccountStatusChangeRequestSchema>;

export const AdminAccountRoleChangeRequestSchema = z.object({ role: AdminAccountRoleSchema });
export type AdminAccountRoleChangeRequest = z.infer<typeof AdminAccountRoleChangeRequestSchema>;

export const AdminAccountPasswordResetRequestSchema = z.object({
  newPassword: ADMIN_NEW_PASSWORD_SCHEMA,
});
export type AdminAccountPasswordResetRequest = z.infer<
  typeof AdminAccountPasswordResetRequestSchema
>;

export const AdminAccountAuditEntrySchema = z.object({
  id: z.number().int().positive(),
  actorAdminId: z.number().int().positive().nullable(),
  targetAdminId: z.number().int().positive().nullable(),
  action: z.enum([
    "ADMIN_CREATED",
    "ADMIN_DISABLED",
    "ADMIN_ENABLED",
    "ROLE_CHANGED",
    "PASSWORD_CHANGED",
    "PASSWORD_RESET",
    "SESSIONS_REVOKED",
  ]),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
});
export type AdminAccountAuditEntry = z.infer<typeof AdminAccountAuditEntrySchema>;

export const AdminAccountAuditListResponseSchema = z.object({
  entries: z.array(AdminAccountAuditEntrySchema),
});
export type AdminAccountAuditListResponse = z.infer<typeof AdminAccountAuditListResponseSchema>;

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
    oauthConfigured: z.boolean(),
    installUrlConfigured: z.boolean(),
    commandSyncEnabled: z.boolean(),
    expectedInteractionsEndpoint: z.string(),
    localSubcommands: z.array(z.string()),
  }),
  creatorProviders: z.record(z.boolean()),
});
export type AdminOverviewResponse = z.infer<typeof AdminOverviewResponseSchema>;

export const AdminPaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});
export type AdminPaginationQuery = z.infer<typeof AdminPaginationQuerySchema>;
