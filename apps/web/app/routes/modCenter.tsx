import { Link } from "react-router";
import { Gamepad2, ShieldCheck, Users, Video } from "lucide-react";
import { AdminGateShell, useGatePermissions } from "../components/admin/AdminGateShell";

export function meta() {
  return [
    { title: "모더레이션 | OwOGG" },
    { name: "description", content: "OwOGG 모더레이터 전용 도구" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

/** /mod — the MODERATOR Staff Role's own entry point. A deliberate subset of /ops's links — see
 * packages/core/src/domain/staffRoles.ts's DEFAULT_ROLE_PERMISSIONS: MODERATOR has no
 * users.ban/games.moderate/game_creators.manage by default, so those cards never appear here
 * unless individually granted. Same "hub of links into the real /admin/* pages" pattern as
 * opsCenter.tsx — see that file's doc comment for why. */
export default function ModCenterRoute() {
  return (
    <AdminGateShell requiredPermission="admin.center.access" title="모더레이션">
      <ModCenterContent />
    </AdminGateShell>
  );
}

function ModCenterContent() {
  const permissions = useGatePermissions();
  const can = (p: string) => permissions.includes(p as never);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-7 px-4 py-8 md:px-8">
      <header>
        <div className="mb-2 inline-flex items-center gap-2 text-accent-green">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">OwOGG Mod</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-text-primary">모더레이션</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
          모더레이터(MODERATOR) 권한으로 사용 가능한 도구입니다. 콘텐츠 심사와 제한적인 유저 조치를
          담당합니다.
        </p>
      </header>

      <nav className="grid gap-3 sm:grid-cols-2" aria-label="모더레이션 도구">
        {can("users.view") && (
          <NavCard
            to="/admin/users"
            icon={Users}
            title="유저 조회"
            desc="검색 및 제한적인 일시 정지"
          />
        )}
        {can("sandbox_games.review") && (
          <NavCard
            to="/admin/sandbox-games"
            icon={Gamepad2}
            title="제작 게임 심사"
            desc="업로드된 버전 승인/거절"
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
