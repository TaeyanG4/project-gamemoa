/**
 * OwOGG staff (operational) role model — pure domain constants + permission resolution. No D1,
 * Hono, or Web Crypto here — persistence lives in packages/db, HTTP wiring in apps/api.
 *
 * Deliberately a *separate axis* from Program/Entitlement access (see domain/gameCreator.ts's
 * GameCreatorAccess) and from Subscription (no OWO_PLUS system exists in this codebase yet — see
 * that file's canApplyForGameCreator() doc comment). A user's account can be any combination of:
 * one Staff Role (or none), Game Creator access (or not), and Streamer/Creator verification (or
 * not) — see docs/AUTHORIZATION.md for the full picture and the reasoning behind keeping these
 * three axes independent instead of one role tree.
 *
 * STAFF_ROLES replaces the old two-tier admin_accounts.role ('SUPERADMIN' | 'ADMIN'):
 * SUPERADMIN -> ADMIN (the one top role, absorbing every SUPERADMIN-only capability), and the old
 * lesser ADMIN tier -> OPERATOR (same capability level, new name, no downgrade — see migration
 * 0025_staff_roles_and_game_creator_program.sql). MODERATOR and SYSTEM_DEVELOPER are newly
 * introduced; no existing row maps to them.
 */

export const STAFF_ROLES = ["ADMIN", "OPERATOR", "MODERATOR", "SYSTEM_DEVELOPER"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const STAFF_ROLE_LABELS_KO: Record<StaffRole, string> = {
  ADMIN: "관리자",
  OPERATOR: "운영자",
  MODERATOR: "모더레이터",
  SYSTEM_DEVELOPER: "시스템 개발자",
};

/** ADMIN is the sole top-level, protected role — see isProtectedStaffRole. Every other role's
 * default permission bundle is enumerated explicitly below rather than derived from a numeric
 * hierarchy: MODERATOR's bundle happens to be a subset of OPERATOR's today, but that's a product
 * decision to keep in sync by hand, not a structural "OPERATOR >= MODERATOR" relationship a
 * future change could rely on. */
export const PERMISSIONS = [
  // Meta-permission: can the admin center shell be entered at all. Granted by default to every
  // staff role except SYSTEM_DEVELOPER (see §10/§25 of the design spec this implements — a
  // SYSTEM_DEVELOPER's baseline is system.dev.access/system.monitor, NOT the admin center; a
  // specific trusted individual can be handed admin.center.access without becoming an OPERATOR).
  "admin.center.access",

  // User moderation (apps/api/src/routes/adminUsers.ts).
  "users.view",
  "users.suspend",
  "users.ban",
  /** Score-submission block + score reset/restore — bundled as one permission since all three are
   * the same "this user's scores need correcting" moderation concern in the current API surface. */
  "users.score_moderation",

  // Built-in game kill switch (apps/api/src/routes/adminGames.ts).
  "games.moderate",

  // Sandbox game (Game Creator submissions) review/publish moderation
  // (apps/api/src/routes/adminSandboxGames.ts): approve/reject/republish/live-version/
  // metadata/visibility.
  "sandbox_games.review",

  // Soft-deleting a sandbox game (apps/api/src/routes/adminSandboxGames.ts, migration 0026) — a
  // stronger, more destructive action than review/approve, so it is its own permission rather than
  // folded into sandbox_games.review: MODERATOR has review but must not have delete (2026-08-18
  // product decision — "관리자나 운영직급만").
  "sandbox_games.delete",

  // Game Creator program administration (apps/api/src/routes/adminGameCreators.ts): direct
  // grant/revoke, and reviewing self-serve applications.
  "game_creators.manage",

  // Streamer/Creator Featured-badge manual review (apps/api/src/routes/adminCreators.ts). Base
  // Streamer status itself has no review step — see domain/gameCreator.ts's sibling doc comment
  // on why STREAMER program access is read directly off creator_profiles.status, not a queue.
  "streamers.review",

  // Read-only operational dashboards (apps/api/src/routes/admin.ts: /overview, /monitoring).
  "system.monitor",

  // SYSTEM_DEVELOPER's own baseline — internal diagnostics, distinct from admin.center.access.
  // Nothing in apps/api currently gates on this beyond the System Developer Center route guard
  // itself; it exists so the permission catalog has a place to grow internal dev-only endpoints
  // into without overloading system.monitor's meaning.
  "system.dev.access",

  // Staff role grants/revokes + individual permission grants/revokes + managed-admin-account
  // lifecycle (apps/api/src/routes/adminAccounts.ts). Deliberately never included in any
  // non-ADMIN default bundle and never delegable via admin_permission_grants — see
  // isDelegatablePermission below.
  "roles.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** `roles.manage` is intentionally excluded — it must never be handed out piecemeal via
 * admin.center.access-style delegation. Granting/revoking roles and permissions (including this
 * one) stays exclusively an ADMIN capability, enforced by ADMIN's implicit "all permissions"
 * rather than by this permission ever appearing in a grantable list. See
 * AdminAccountUseCases.grantPermission, which rejects it defensively too (defense in depth, not
 * the only guard). */
export function isDelegatablePermission(permission: Permission): boolean {
  return permission !== "roles.manage";
}

/**
 * Default permission bundle per Staff Role. ADMIN is handled specially in {@link hasPermission}
 * (implicit "all permissions") rather than listed here, so this map never needs updating when
 * PERMISSIONS grows — an omission here would otherwise silently under-grant the top role.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<Exclude<StaffRole, "ADMIN">, Permission[]> = {
  OPERATOR: [
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
  ],
  // A deliberate subset of OPERATOR's bundle (see the module doc comment on why this isn't
  // expressed as a hierarchy): no users.ban, no games.moderate (the built-in-game kill switch is
  // a stronger action than content review), no game_creators.manage, no sandbox_games.delete.
  MODERATOR: [
    "admin.center.access",
    "users.view",
    "users.suspend",
    "sandbox_games.review",
    "streamers.review",
  ],
  // No admin.center.access by default — see the PERMISSIONS entry's doc comment. A
  // SYSTEM_DEVELOPER who also needs the admin center gets admin.center.access as an individual
  // grant (admin_permission_grants), not by widening this bundle.
  SYSTEM_DEVELOPER: ["system.dev.access", "system.monitor"],
};

/** ADMIN is the sole top-level, protected Staff Role — see docs/AUTHORIZATION.md "Protected
 * ADMIN". Nothing else in STAFF_ROLES is protected: OPERATOR/MODERATOR/SYSTEM_DEVELOPER can be
 * moderated (suspended/banned) like any other account if the product ever needs that, though no
 * caller does so today. */
export function isProtectedStaffRole(role: StaffRole | null): boolean {
  return role === "ADMIN";
}

/**
 * Resolves whether an actor holding `role` (their Staff Role, or null if they have none) plus
 * `grantedPermissions` (their individual admin_permission_grants rows) may perform `permission`.
 *
 * ADMIN always returns true — "ALL ADMIN PERMISSIONS" per docs/AUTHORIZATION.md, not an
 * enumerated bundle that could drift out of sync as PERMISSIONS grows. Every other role checks
 * its default bundle first, then individual grants (which is how a SYSTEM_DEVELOPER — or anyone
 * — receives a permission outside their role's defaults, e.g. admin.center.access).
 */
export function hasPermission(
  role: StaffRole | null,
  grantedPermissions: readonly Permission[],
  permission: Permission,
): boolean {
  if (role === null) return false;
  if (role === "ADMIN") return true;
  if (DEFAULT_ROLE_PERMISSIONS[role].includes(permission)) return true;
  return grantedPermissions.includes(permission);
}

/** The full, de-duplicated set of permissions `role` + `grantedPermissions` resolves to — what a
 * client-facing "here is everything you can do" response enumerates (e.g. GET /api/me/access),
 * as opposed to hasPermission's single yes/no check. ADMIN returns the entire PERMISSIONS catalog
 * (matching hasPermission's "implicit all" rule) rather than an empty default bundle. */
export function effectivePermissions(
  role: StaffRole | null,
  grantedPermissions: readonly Permission[],
): Permission[] {
  if (role === null) return [];
  if (role === "ADMIN") return [...PERMISSIONS];
  return [...new Set([...DEFAULT_ROLE_PERMISSIONS[role], ...grantedPermissions])];
}
