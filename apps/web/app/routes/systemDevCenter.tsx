import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Activity, Loader2, ServerCog, ShieldCheck } from "lucide-react";
import { AdminGateShell, useGatePermissions } from "../components/admin/AdminGateShell";
import { fetchAdminMonitoring } from "../features/adminApi";
import type { AdminMonitoringResponse } from "@owogg/contracts";

export function meta() {
  return [
    { title: "시스템 개발 | OwOGG" },
    { name: "description", content: "OwOGG 시스템 개발자 전용 진단 도구" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

/** /system-dev — the SYSTEM_DEVELOPER Staff Role's own entry point. Gated on `system.dev.access`
 * (its own baseline), deliberately NOT `admin.center.access` — a SYSTEM_DEVELOPER cannot reach
 * /admin, /ops, or /mod unless an ADMIN individually grants admin.center.access on top (see
 * /admin/accounts's permission delegation UI). See docs/AUTHORIZATION.md.
 *
 * There is genuinely no other "internal system developer tool" in this codebase yet beyond the
 * existing operational monitoring dashboard — this page reuses that (permission-gated on
 * `system.monitor`, which is NOT part of SYSTEM_DEVELOPER's default bundle either) rather than
 * inventing a feature that doesn't exist. See PERMISSIONS' doc comment in
 * packages/core/src/domain/staffRoles.ts for why `system.dev.access` exists as a distinct,
 * currently-thin permission to grow real internal tooling into later. */
export default function SystemDevCenterRoute() {
  return (
    <AdminGateShell requiredPermission="system.dev.access" title="시스템 개발">
      <SystemDevCenterContent />
    </AdminGateShell>
  );
}

function SystemDevCenterContent() {
  const permissions = useGatePermissions();
  const canMonitor = permissions.includes("system.monitor");
  const [monitoring, setMonitoring] = useState<AdminMonitoringResponse | null>(null);
  const [loading, setLoading] = useState(canMonitor);

  useEffect(() => {
    if (!canMonitor) return;
    fetchAdminMonitoring()
      .then(setMonitoring)
      .finally(() => setLoading(false));
  }, [canMonitor]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-7 px-4 py-8 md:px-8">
      <header>
        <div className="mb-2 inline-flex items-center gap-2 text-text-muted">
          <ServerCog className="h-5 w-5" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">
            OwOGG System Dev
          </span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-text-primary">시스템 개발</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
          OwOGG 자체 시스템을 개발하는 시스템 개발자용 페이지입니다. 게임 크리에이터와는 다른
          개념입니다 — 게임/맵을 만드는 사용자가 아니라 OwOGG 플랫폼 자체를 만드는 인력입니다.
        </p>
      </header>

      {canMonitor ? (
        <section className="rounded-2xl border border-border bg-surface-raised p-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-light" />
            <h2 className="text-sm font-black text-text-primary">운영 상태 요약</h2>
          </div>
          {loading ? (
            <p className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> 불러오는 중...
            </p>
          ) : monitoring ? (
            <dl className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
              <Stat label="DAU" value={monitoring.activeUsers.dau} />
              <Stat label="WAU" value={monitoring.activeUsers.wau} />
              <Stat
                label="D1"
                value={monitoring.d1.healthy ? "정상" : "장애"}
                warn={!monitoring.d1.healthy}
              />
              <Stat label="D1 지연" value={`${monitoring.d1.latencyMs}ms`} />
            </dl>
          ) : (
            <p className="text-xs text-text-muted">불러오지 못했습니다.</p>
          )}
          <Link
            to="/admin/monitoring"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-light hover:underline"
          >
            전체 운영 모니터링 대시보드 →
          </Link>
        </section>
      ) : (
        <section className="rounded-2xl border border-border bg-surface-raised p-5 text-xs text-text-muted">
          <p>
            현재 계정은 <code>system.monitor</code> 권한이 없어 운영 상태 요약을 볼 수 없습니다.
            필요하다면 ADMIN에게 개별 권한 위임을 요청하세요.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-dashed border-border bg-surface p-5 text-xs text-text-muted">
        <p>
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5 align-text-bottom text-text-muted" />이
          페이지는 아직 최소한의 진단 정보만 제공합니다. 추가 내부 개발 도구는 실제 필요가 생기면 이
          자리에 추가될 예정입니다 — 지금 없는 기능을 있는 것처럼 표시하지 않습니다.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div>
      <dt className="text-text-muted">{label}</dt>
      <dd className={`text-lg font-black ${warn ? "text-accent-red" : "text-text-primary"}`}>
        {value}
      </dd>
    </div>
  );
}
