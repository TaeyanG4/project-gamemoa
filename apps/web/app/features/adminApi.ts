import { z } from "zod";
import {
  AdminMeResponseSchema,
  AdminOverviewResponseSchema,
  AdminGoogleStepUpResponseSchema,
  AdminLoginResponseSchema,
} from "@gamemoa/contracts";
import { apiFetch } from "../lib/api/client";

const AdminLogoutResponseSchema = z.object({ success: z.boolean() });

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
