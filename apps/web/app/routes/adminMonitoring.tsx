import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Activity, Database, Gamepad2, RefreshCw, ShieldAlert, Users } from "lucide-react";
import { useAuth } from "../features/auth";
import { fetchAdminMonitoring } from "../features/adminApi";
import { usePublicGames } from "../features/publicGamesApi";
import { publicGameToCard } from "../features/catalog/publicGameAdapter";
import type { AdminMonitoringResponse } from "@owogg/contracts";
import { ApiClientError } from "../lib/api";

export function meta() {
  return [
    { title: "운영 모니터링 | OwOGG" },
    { name: "description", content: "OwOGG 운영 상태, 활성 유저, 게임별 플레이 현황 모니터링" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

/** /admin/monitoring — read-only operational snapshot. Deliberately has no auto-refresh
 * interval; an admin opens this page to check current state, not to leave it running as a live
 * dashboard, so a manual refresh button (same pattern as adminGames.tsx) is enough for v1. */
export default function AdminMonitoringRoute() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { games: publicGames } = usePublicGames();
  const gamesBySlug = useMemo(
    () => new Map(publicGames.map((game) => [game.slug, publicGameToCard(game)])),
    [publicGames],
  );
  const [data, setData] = useState<AdminMonitoringResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      setData(await fetchAdminMonitoring());
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        setAccessDenied(true);
        setError(
          err.code === "ADMIN_SESSION_REQUIRED"
            ? "관리자 로그인이 필요합니다. /admin 에서 본인 확인을 먼저 완료해주세요."
            : "이 페이지는 지정된 OwOGG 관리자만 사용할 수 있습니다.",
        );
      } else {
        setError(err instanceof Error ? err.message : "모니터링 데이터를 불러올 수 없습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) void load();
  }, [authLoading, isAuthenticated]);

  if (authLoading) {
    return <PageMessage>접근 권한을 확인하는 중...</PageMessage>;
  }

  if (!isAuthenticated) {
    return (
      <PageMessage>
        운영 모니터링을 사용하려면 <Link to="/profile">OwOGG 로그인</Link>이 필요합니다.
      </PageMessage>
    );
  }

  if (accessDenied) {
    return (
      <PageMessage>
        <h1 className="text-lg font-black text-text-primary">접근 권한이 없습니다</h1>
        <p className="mt-2 text-sm text-text-muted">
          지정된 OwOGG 관리자 계정만 운영 모니터링을 볼 수 있습니다.
        </p>
        <Link
          to="/admin"
          className="mt-6 inline-flex rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-brand"
        >
          관리자 센터로 돌아가기
        </Link>
      </PageMessage>
    );
  }

  const maxPlayCount = data?.gamePlayCounts.reduce((max, g) => Math.max(max, g.count), 0) ?? 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-accent-yellow">
            <ShieldAlert className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Admin Safety</span>
          </div>
          <h1 className="text-2xl font-black text-text-primary">운영 모니터링</h1>
          <p className="mt-1 text-xs text-text-muted">
            읽기 전용 스냅샷입니다 — 페이지를 열 때마다 새로 조회되며, 자동으로 갱신되지 않습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs font-bold text-text-primary hover:border-brand focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </button>
      </header>

      {error && (
        <div className="rounded-2xl border border-accent-red/30 bg-accent-red/10 p-4 text-xs text-accent-red">
          {error}
        </div>
      )}

      {!data ? (
        <PageMessage>모니터링 데이터를 불러오는 중...</PageMessage>
      ) : (
        <>
          {/* Active users + D1 health — a slim unboxed row, matching /users/:id's stat treatment. */}
          <section className="grid grid-cols-1 gap-6 border-t border-border pt-6 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                <Users className="h-3.5 w-3.5 text-brand-light" />
                DAU (24시간)
              </span>
              <span className="text-2xl font-black text-text-primary">
                {data.activeUsers.dau.toLocaleString()}명
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                <Users className="h-3.5 w-3.5 text-brand-light" />
                WAU (7일)
              </span>
              <span className="text-2xl font-black text-text-primary">
                {data.activeUsers.wau.toLocaleString()}명
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                <Database className="h-3.5 w-3.5 text-brand-light" />
                D1 상태
              </span>
              <span
                className={`text-2xl font-black ${data.d1.healthy ? "text-accent-green" : "text-accent-red"}`}
              >
                {data.d1.healthy ? "정상" : "응답 없음"}
              </span>
              <span className="text-[11px] text-text-muted">지연 시간 {data.d1.latencyMs}ms</span>
            </div>
          </section>

          {/* Per-game play counts — divided list bars, no bordered card. */}
          <section className="flex flex-col gap-3 border-t border-border pt-6">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-text-primary">
              <Gamepad2 className="h-4 w-4 text-brand-light" />
              게임별 플레이 횟수 (최근 {data.gamePlayCountsWindowDays}일)
            </h2>
            {data.gamePlayCounts.length === 0 ? (
              <p className="text-xs text-text-muted">이 기간 동안 제출된 점수가 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.gamePlayCounts.map(({ gameId, count }) => {
                  const title = gamesBySlug.get(gameId)?.title ?? gameId;
                  const widthPercent = maxPlayCount > 0 ? (count / maxPlayCount) * 100 : 0;
                  return (
                    <div key={gameId} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-text-primary">{title}</span>
                        <span className="font-black text-brand-light">
                          {count.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="flex items-start gap-2 border-t border-border pt-6 text-[11px] text-text-muted">
            <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              요청 단위 API 트래픽/지연 시간, D1 쿼리별 상세 통계는 이 Worker가 자체적으로 집계하지
              않습니다 — Cloudflare 대시보드의 Workers Observability / D1 Analytics를 참고하세요.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function PageMessage({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-xl px-4 py-24 text-center">{children}</div>;
}
