import { z } from "zod";

/** Mirrors packages/core/src/domain/staffRoles.ts's STAFF_ROLES/PERMISSIONS — kept as a parallel
 * literal list (not generated from the core export) since contracts intentionally has no
 * dependency on core; see the other contracts files for the same pattern. */
export const StaffRoleSchema = z.enum(["ADMIN", "OPERATOR", "MODERATOR", "SYSTEM_DEVELOPER"]);
export type StaffRoleValue = z.infer<typeof StaffRoleSchema>;

export const PermissionSchema = z.enum([
  "admin.center.access",
  "users.view",
  "users.suspend",
  "users.ban",
  "users.score_moderation",
  "games.moderate",
  "sandbox_games.review",
  "sandbox_games.delete",
  "game_creators.manage",
  "streamers.review",
  "system.monitor",
  "system.dev.access",
  "roles.manage",
]);
export type PermissionValue = z.infer<typeof PermissionSchema>;

export const PermissionGrantRequestSchema = z.object({
  permission: PermissionSchema,
});
export type PermissionGrantRequest = z.infer<typeof PermissionGrantRequestSchema>;

/**
 * GET /api/me/access — the single call the web app makes to decide what to show in the profile
 * dropdown and which route guards pass, across all three independent axes (Staff Role, Game
 * Creator program, Streamer program). See docs/AUTHORIZATION.md.
 */
export const MyAccessResponseSchema = z.object({
  staffRole: StaffRoleSchema.nullable(),
  /** Default-bundle permissions for `staffRole` plus any individual admin_permission_grants rows,
   * already merged — the client never needs to know the default-bundle table. Empty when
   * staffRole is null. Omitted (not enumerated) for ADMIN, whose UI check is simply
   * `staffRole === "ADMIN"` — see hasPermission's "ADMIN implies everything" rule in core. */
  permissions: z.array(PermissionSchema),
  gameCreator: z.object({
    hasAccess: z.boolean(),
    canApply: z.boolean(),
    applicationStatus: z.enum(["PENDING", "APPROVED", "REJECTED", "WITHDRAWN"]).nullable(),
  }),
  streamer: z.object({
    /** Mirrors creator_profiles.status === 'VERIFIED' — see domain/gameCreator.ts's sibling doc
     * comment on why base Streamer status has no separate application/approval step today. */
    isVerified: z.boolean(),
  }),
});
export type MyAccessResponse = z.infer<typeof MyAccessResponseSchema>;
