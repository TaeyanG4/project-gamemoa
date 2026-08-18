import { useEffect, useState, useCallback } from "react";
import { fetchAdminMe } from "./adminApi";
import { fetchMyAccess } from "./myAccess";
import type { PermissionValue } from "@owogg/contracts";

export type AdminGateStage =
  "loading" | "need-owogg-login" | "not-eligible" | "step-up-required" | "forbidden" | "ready";

/**
 * Shared elevation + permission check for the non-/admin Staff Role centers (Ops/Mod/System Dev —
 * see docs/AUTHORIZATION.md). The actual step-up UI (Google button + bootstrap/login forms) lives
 * only on /admin — the `owogg_admin_session` cookie it sets is shared across every page, so a
 * staff member who already completed step-up once (typically by visiting /admin, whose dashboard
 * links to these centers) reaches "ready" here immediately without redoing it. Someone who lands
 * on e.g. /ops directly with no prior step-up sees "step-up-required" and a link to /admin instead
 * of a second copy of that flow — deliberately not duplicated here (see GoogleStepUpPanel's own
 * doc comment on a real race condition that fix required getting right once, not twice).
 */
export function useAdminGate(requiredPermission: PermissionValue) {
  const [stage, setStage] = useState<AdminGateStage>("loading");
  const [permissions, setPermissions] = useState<PermissionValue[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStage("loading");
    try {
      const me = await fetchAdminMe();
      if (!me.authenticated) {
        setStage("need-owogg-login");
        return;
      }
      if (!me.eligible) {
        setStage("not-eligible");
        return;
      }
      if (!me.adminAuthenticated || me.mustChangePassword) {
        setStage("step-up-required");
        return;
      }
      const access = await fetchMyAccess();
      setPermissions(access.permissions);
      const allowed = me.role === "ADMIN" || access.permissions.includes(requiredPermission);
      setStage(allowed ? "ready" : "forbidden");
    } catch (err) {
      setError(err instanceof Error ? err.message : "권한을 확인할 수 없습니다.");
      setStage("not-eligible");
    }
  }, [requiredPermission]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { stage, permissions, error, refresh };
}
