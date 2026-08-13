import { AdminMeResponseSchema, AdminOverviewResponseSchema } from "@gamemoa/contracts";
import { apiFetch } from "../lib/api/client";

export function fetchAdminMe() {
  return apiFetch("/api/admin/me", AdminMeResponseSchema);
}

export function fetchAdminOverview() {
  return apiFetch("/api/admin/overview", AdminOverviewResponseSchema);
}
