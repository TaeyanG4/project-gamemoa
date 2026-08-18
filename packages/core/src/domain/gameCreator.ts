/**
 * Game Creator program policy (pure domain constants). No D1/Hono here — persistence lives in
 * packages/db, HTTP wiring lives in apps/api. See docs/AUTHORIZATION.md and
 * docs/GAME_CREATION_GUIDE.md §3.6.
 *
 * GAME_CREATOR is deliberately NOT a Staff Role (see domain/staffRoles.ts) — a game creator is a
 * regular OwOGG user approved to use the sandbox game upload/publish pipeline, never an
 * administrator, and never gets a password/Google step-up session. This module's two record
 * types capture the two things that can be true about a user's relationship to the program:
 *
 *   - {@link GameCreatorAccessStatus}: do they currently have upload access at all (ACTIVE), or
 *     did they once and had it taken away (REVOKED)? A missing row means "never granted".
 *   - {@link GameCreatorApplicationStatus}: the self-serve "please approve me" request a user can
 *     submit, independent of the admin-direct grant path (GameCreatorUseCases.grant) that
 *     predates this file and still works unchanged — an admin/operator can still invite someone
 *     directly without them ever filing an application.
 */

export const GAME_CREATOR_ACCESS_STATUSES = ["ACTIVE", "REVOKED"] as const;
export type GameCreatorAccessStatus = (typeof GAME_CREATOR_ACCESS_STATUSES)[number];

export const GAME_CREATOR_ACCESS_AUDIT_ACTIONS = ["GRANTED", "REVOKED", "REINSTATED"] as const;
export type GameCreatorAccessAuditAction = (typeof GAME_CREATOR_ACCESS_AUDIT_ACTIONS)[number];

export const GAME_CREATOR_APPLICATION_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
] as const;
export type GameCreatorApplicationStatus = (typeof GAME_CREATOR_APPLICATION_STATUSES)[number];

/**
 * Policy hook for "may this user submit a Game Creator application right now" — deliberately not
 * wired to any subscription/billing check. No OWO_PLUS (or any) subscription system exists
 * anywhere in this codebase today (confirmed by a repository-wide search — there is no
 * subscription table, route, or contract), so hard-coding an OwO Plus gate here would either be
 * dead code or, worse, silently block every application. This function unconditionally returns
 * true today; a future OwO Plus eligibility check is meant to replace this single function body
 * without touching any call site (GameCreatorUseCases.apply is the only caller). See
 * docs/AUTHORIZATION.md's "현재 구현 vs 향후 계획" section — do not read this as OwO Plus already
 * being required or already being wired in.
 */
export function canApplyForGameCreator(): boolean {
  return true;
}
