import { z } from "zod";
import {
  AdminMeResponseSchema,
  AdminOverviewResponseSchema,
  AdminMonitoringResponseSchema,
  AdminGoogleStepUpResponseSchema,
  AdminLoginResponseSchema,
  AdminBootstrapRequestSchema,
  AdminBootstrapResponseSchema,
  AdminPasswordChangeRequestSchema,
  AdminPasswordChangeResponseSchema,
  AdminAccountListResponseSchema,
  AdminAccountCreateRequestSchema,
  AdminAccountAuditListResponseSchema,
  AdminGameListResponseSchema,
  AdminGameToggleResponseSchema,
  AdminUserSearchResponseSchema,
  AdminUserDetailResponseSchema,
  UserModerationRecordSchema,
  AdminScoreActionResponseSchema,
  GameDeveloperListResponseSchema,
  GameDeveloperRecordSchema,
  SandboxGameReviewQueueResponseSchema,
  SandboxGameVersionRecordSchema,
  SandboxGameRecordSchema,
  SandboxGameDetailResponseSchema,
  type AdminAccountRoleValue,
  type AdminAccountStatusValue,
  type AdminUserPeriod,
  type AdminUserSort,
  type SandboxGameMetadataUpdateRequest,
  type SandboxGameVisibility,
} from "@owogg/contracts";
import { apiFetch } from "../lib/api/client";

const AdminLogoutResponseSchema = z.object({ success: z.boolean() });
const AdminSuccessResponseSchema = z.object({ success: z.boolean() });
const AdminAccountSummaryOnCreateSchema = z.object({
  id: z.number(),
  userId: z.number(),
  nickname: z.string(),
  username: z.string(),
  role: z.enum(["SUPERADMIN", "ADMIN"]),
  status: z.enum(["ACTIVE", "DISABLED"]),
  mustChangePassword: z.boolean(),
  createdAt: z.string(),
  passwordChangedAt: z.string(),
  isSelf: z.boolean(),
});

export function fetchAdminMe() {
  return apiFetch("/api/admin/me", AdminMeResponseSchema);
}

export function fetchAdminOverview() {
  return apiFetch("/api/admin/overview", AdminOverviewResponseSchema);
}

export function fetchAdminMonitoring() {
  return apiFetch("/api/admin/monitoring", AdminMonitoringResponseSchema);
}

export function postAdminGoogleStepUp(credential: string) {
  return apiFetch("/api/admin/auth/google", AdminGoogleStepUpResponseSchema, {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export function postAdminLogin(username: string, password: string) {
  return apiFetch("/api/admin/auth/login", AdminLoginResponseSchema, {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function postAdminLogout() {
  return apiFetch("/api/admin/auth/logout", AdminLogoutResponseSchema, {
    method: "POST",
  });
}

export function postAdminBootstrap(input: {
  username: string;
  password: string;
  passwordConfirm: string;
}) {
  const body = AdminBootstrapRequestSchema.parse(input);
  return apiFetch("/api/admin/bootstrap", AdminBootstrapResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function postAdminPasswordChange(input: {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}) {
  const body = AdminPasswordChangeRequestSchema.parse(input);
  return apiFetch("/api/admin/settings/password", AdminPasswordChangeResponseSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchAdminAccounts() {
  return apiFetch("/api/admin/accounts", AdminAccountListResponseSchema);
}

export function fetchAdminAccountAudit() {
  return apiFetch("/api/admin/accounts/audit", AdminAccountAuditListResponseSchema);
}

export function postCreateAdminAccount(input: {
  userId: number;
  username: string;
  password: string;
  role: AdminAccountRoleValue;
}) {
  const body = AdminAccountCreateRequestSchema.parse(input);
  return apiFetch("/api/admin/accounts", AdminAccountSummaryOnCreateSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchAdminAccountStatus(id: number, status: AdminAccountStatusValue) {
  return apiFetch(`/api/admin/accounts/${id}/status`, AdminSuccessResponseSchema, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function patchAdminAccountRole(id: number, role: AdminAccountRoleValue) {
  return apiFetch(`/api/admin/accounts/${id}/role`, AdminSuccessResponseSchema, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function postResetAdminAccountPassword(id: number, newPassword: string) {
  return apiFetch(`/api/admin/accounts/${id}/reset-password`, AdminSuccessResponseSchema, {
    method: "POST",
    body: JSON.stringify({ newPassword }),
  });
}

export function postRevokeAdminAccountSessions(id: number) {
  return apiFetch(`/api/admin/accounts/${id}/revoke-sessions`, AdminSuccessResponseSchema, {
    method: "POST",
  });
}

export function fetchAdminGames() {
  return apiFetch("/api/admin/games", AdminGameListResponseSchema);
}

export function postToggleAdminGame(gameId: string, enabled: boolean, reason: string | null) {
  return apiFetch(`/api/admin/games/${gameId}/toggle`, AdminGameToggleResponseSchema, {
    method: "POST",
    body: JSON.stringify({ enabled, reason }),
  });
}

export interface AdminUserListParams {
  query?: string | undefined;
  period?: AdminUserPeriod | undefined;
  sort?: AdminUserSort | undefined;
  page?: number | undefined;
  pageSize?: number | undefined;
}

export function fetchAdminUserList(params: AdminUserListParams) {
  const search = new URLSearchParams();
  if (params.query) search.set("query", params.query);
  if (params.period) search.set("period", params.period);
  if (params.sort) search.set("sort", params.sort);
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  return apiFetch(`/api/admin/users?${search.toString()}`, AdminUserSearchResponseSchema);
}

export function fetchAdminUserDetail(userId: number) {
  return apiFetch(`/api/admin/users/${userId}`, AdminUserDetailResponseSchema);
}

export function postSuspendUser(userId: number, suspendedUntil: string, reason: string) {
  return apiFetch(`/api/admin/users/${userId}/suspend`, UserModerationRecordSchema, {
    method: "POST",
    body: JSON.stringify({ suspendedUntil, reason }),
  });
}

export function postBanUser(userId: number, reason: string) {
  return apiFetch(`/api/admin/users/${userId}/ban`, UserModerationRecordSchema, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function postUnsuspendUser(userId: number) {
  return apiFetch(`/api/admin/users/${userId}/unsuspend`, UserModerationRecordSchema, {
    method: "POST",
  });
}

export function postScoreSubmissionBlock(userId: number, blocked: boolean, reason: string | null) {
  return apiFetch(`/api/admin/users/${userId}/score-submission-block`, UserModerationRecordSchema, {
    method: "POST",
    body: JSON.stringify({ blocked, reason }),
  });
}

export function postResetUserScores(userId: number, reason: string) {
  return apiFetch(`/api/admin/users/${userId}/reset-scores`, AdminScoreActionResponseSchema, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function postRestoreUserScores(userId: number) {
  return apiFetch(`/api/admin/users/${userId}/restore-scores`, AdminScoreActionResponseSchema, {
    method: "POST",
  });
}

// ── Game developers (upload permission, V1 invite-only) ──

export function fetchGameDevelopers() {
  return apiFetch("/api/admin/game-developers", GameDeveloperListResponseSchema);
}

export function postGrantGameDeveloper(userId: number) {
  return apiFetch("/api/admin/game-developers", GameDeveloperRecordSchema, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function postRevokeGameDeveloper(userId: number) {
  return apiFetch(`/api/admin/game-developers/${userId}/revoke`, GameDeveloperRecordSchema, {
    method: "POST",
  });
}

// ── Sandbox games (review queue, publish, generalized metadata) ──

export function fetchSandboxReviewQueue(page = 1, pageSize = 20) {
  return apiFetch(
    `/api/admin/sandbox-games/review-queue?page=${page}&pageSize=${pageSize}`,
    SandboxGameReviewQueueResponseSchema,
  );
}

export function fetchAdminSandboxGameDetail(id: number) {
  return apiFetch(`/api/admin/sandbox-games/${id}`, SandboxGameDetailResponseSchema);
}

export function postApproveSandboxVersion(versionId: number) {
  return apiFetch(
    `/api/admin/sandbox-games/versions/${versionId}/approve`,
    SandboxGameVersionRecordSchema,
    { method: "POST" },
  );
}

export function postRejectSandboxVersion(versionId: number, reason: string) {
  return apiFetch(
    `/api/admin/sandbox-games/versions/${versionId}/reject`,
    SandboxGameVersionRecordSchema,
    { method: "POST", body: JSON.stringify({ reason }) },
  );
}

export function patchSandboxGameMetadata(id: number, input: SandboxGameMetadataUpdateRequest) {
  return apiFetch(`/api/admin/sandbox-games/${id}/metadata`, SandboxGameRecordSchema, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function patchSandboxGameVisibility(id: number, visibility: SandboxGameVisibility) {
  return apiFetch(`/api/admin/sandbox-games/${id}/visibility`, SandboxGameRecordSchema, {
    method: "PATCH",
    body: JSON.stringify({ visibility }),
  });
}
