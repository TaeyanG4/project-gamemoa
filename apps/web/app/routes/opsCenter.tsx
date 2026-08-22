import { Link } from "react-router";
import { Activity, Gamepad2, ShieldCheck, UserCog, Users, Video } from "lucide-react";
import { AdminGateShell, useGatePermissions } from "../components/admin/AdminGateShell";

export function meta() {
  return [
    { title: "운영 센터 | OwOGG" },
    { name: "description", content: "OwOGG 운영자 전용 도구" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

/** /ops — the OPERATOR Staff Role's own entry point (docs/AUTHORIZATION.md). Deliberately a
 * curated hub of links into the existing /admin/* pages rather than a duplicate re-implementation
 * of their tables/actions — those pages already work for any elevated session with the right
 * permission (enforced server-side per apps/api/src/routes/admin*.ts), so this page's job is just
 * to surface the subset relevant to OPERATOR under its own identity, not rebuild them. */
export default function OpsCenterRoute() {
  return (
    <AdminGateShell requiredPermission="admin.center.access" title="운영 센터">
      <OpsCenterContent />
    </AdminGateShell>
  );
}

function OpsCenterContent() {
  const permissions = useGatePermissions();
  const can = (p: string) => permissions.includes(p as never);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-7 px-4 py-8 md:px-8">
      <header>
        <div className="mb-2 inline-flex items-center gap-2 text-brand">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">OwOGG Ops</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-text-primary">운영 센터</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
          운영자(OPERATOR) 권한으로 사용 가능한 도구입니다. 아래 각 항목은 보유한 권한만 표시되며,
          서버에서도 동일하게 검증됩니다.
        </p>
      </header>

      <nav className="grid gap-3 sm:grid-cols-2" aria-label="운영 도구">
        {can("users.view") && (
          <NavCard
            to="/admin/users"
            icon={Users}
            title="유저 관리"
            desc="검색, 경고성 조치, 정지/차단"
          />
        )}
        {(can("games.moderate") || can("sandbox_games.review")) && (
          <NavCard
            to="/admin/games"
            icon={Gamepad2}
            title="게임 관리 및 심사"
            desc="OWOGG 게시, 전체 게임 안전 제어, 사용자 게임 심사"
          />
        )}
        {can("game_creators.manage") && (
          <NavCard
            to="/admin/game-creators"
            icon={UserCog}
            title="게임 크리에이터 관리"
            desc="신청 심사, 직접 임명/해제"
          />
        )}
        {can("streamers.review") && (
          <NavCard
            to="/admin/creators"
            icon={Video}
            title="Creator 심사"
            desc="Featured 배지 수동 심사"
          />
        )}
        {can("system.monitor") && (
          <NavCard
            to="/admin/monitoring"
            icon={Activity}
            title="운영 모니터링"
            desc="DAU/WAU, D1 상태"
          />
        )}
      </nav>
    </div>
  );
}

function NavCard({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: typeof Users;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-start gap-3 rounded-2xl border border-border bg-surface-raised p-4 hover:border-brand"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-light" />
      <div>
        <p className="text-sm font-bold text-text-primary">{title}</p>
        <p className="mt-0.5 text-xs text-text-muted">{desc}</p>
      </div>
    </Link>
  );
}
