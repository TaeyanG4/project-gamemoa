/**
 * Game-developer upload permission policy (pure domain constants). No D1/Hono here — persistence
 * lives in packages/db, HTTP wiring lives in apps/api. See docs/GAME_CREATION_GUIDE.md §3.6.
 *
 * Deliberately separate from admin_accounts (packages/core/src/domain/adminAccounts.ts): a game
 * developer is not an administrator and never gets a password/Google step-up session — this is
 * only ever an upload permission grant.
 */

export const GAME_DEVELOPER_STATUSES = ["ACTIVE", "REVOKED"] as const;
export type GameDeveloperStatus = (typeof GAME_DEVELOPER_STATUSES)[number];

export const GAME_DEVELOPER_AUDIT_ACTIONS = ["GRANTED", "REVOKED", "REINSTATED"] as const;
export type GameDeveloperAuditAction = (typeof GAME_DEVELOPER_AUDIT_ACTIONS)[number];
