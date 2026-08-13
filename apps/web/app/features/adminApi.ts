import { z } from "zod";
import {
  AdminMeResponseSchema,
  AdminOverviewResponseSchema,
  AdminGoogleStepUpResponseSchema,
  AdminLoginResponseSchema,
  AdminBootstrapRequestSchema,
  AdminBootstrapResponseSchema,
  AdminPasswordChangeRequestSchema,
  AdminPasswordChangeResponseSchema,
  AdminAccountListResponseSchema,
  AdminAccountCreateRequestSchema,
  AdminAccountAuditListResponseSchema,
  type AdminAccountRoleValue,
  type AdminAccountStatusValue,
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
