import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react";
import { fetchAdminMe, fetchAdminOverview } from "../features/adminApi";
import type { AdminOverviewResponse } from "@gamemoa/contracts";
import { ApiClientError } from "../lib/api/errors";

export function meta() {
  return [
    { title: "관리자 센터 | GAMEMOA" },
    { name: "description", content: "GAMEMOA 관리자 전용 운영 센터" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

export default function AdminRoute() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const me = await fetchAdminMe();
        if (!active) return;
        if (!me.admin) {
          setAllowed(false);
          setLoading(false);
          return;
        }
        setAllowed(true);
        const nextOverview = await fetchAdminOverview();
        if (active) setOverview(nextOverview);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof ApiClientError && (err.status === 401 || err.status === 403)
            ? "이 페이지는 지정된 GAMEMOA 관리자만 사용할 수 있습니다."
            : err instanceof Error
              ? err.message
              : "관리자 상태를 확인할 수 없습니다.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <PageMessage>관리자 권한을 확인하는 중...</PageMessage>;
  if (!allowed || error) {
    return (
      <PageMessage>
        <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-text-muted" />
        <h1 className="text-lg font-black text-text-primary">관리자 전용 페이지</h1>
        <p className="mt-2 text-sm text-text-muted">
          {error || "현재 계정에는 관리자 센터 접근 권한이 없습니다."}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-brand"
        >
          홈으로 돌아가기
        </Link>
      </PageMessage>
    );
  }

  if (!overview) return <PageMessage>관리자 요약을 불러올 수 없습니다.</PageMessage>;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-accent-yellow">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">GAMEMOA Admin</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-text-primary">관리자 센터</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
            운영에 필요한 안전한 상태 요약과 Creator 심사 도구를 한곳에서 확인합니다.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-2 text-xs font-bold text-accent-green">
          <CheckCircle2 className="h-4 w-4" /> 관리자 인증됨
        </span>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="핵심 운영 상태">
        <MetricCard
          icon={<Clock3 className="h-4 w-4" />}
          label="대기 중 Creator 심사"
          value={overview.pendingCreatorReviews.toLocaleString()}
          tone="yellow"
        />
        <MetricCard
          icon={<Server className="h-4 w-4" />}
          label="등록된 활성 Discord 서버"
          value={overview.discord.activeGuildCount.toLocaleString()}
          tone="purple"
        />
        <MetricCard
          icon={<Activity className="h-4 w-4" />}
          label="Discord HTTP Interactions"
          value={overview.discord.interactionsConfigured ? "준비됨" : "외부 설정 대기"}
          tone={overview.discord.interactionsConfigured ? "green" : "red"}
        />
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="최근 감사 기록"
          value={overview.recentAudits.length.toLocaleString()}
          tone="blue"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <article className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-accent-yellow">
                Creator
              </p>
              <h2 className="mt-1 text-xl font-black text-text-primary">Featured 수동 심사</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                공식 소유권과 자격 지표만 확인하고, 모든 결정은 append-only 감사 원장에 남깁니다.
              </p>
            </div>
            <Clock3 className="h-6 w-6 shrink-0 text-accent-yellow" />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              to="/admin/creators"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-brand"
            >
              심사 큐 열기 <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-xs text-text-muted">대기 {overview.pendingCreatorReviews}건</span>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10">
          <h2 className="text-sm font-black text-text-primary">Creator Provider 준비 상태</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {Object.entries(overview.creatorProviders).map(([provider, configured]) => (
              <div
                key={provider}
                className="flex items-center justify-between rounded-xl bg-surface px-3 py-2.5"
              >
                <span className="text-xs font-bold text-text-primary">{provider}</span>
                <span
                  className={`text-[10px] font-bold ${configured ? "text-accent-green" : "text-text-muted"}`}
                >
                  {configured ? "준비됨" : "미설정"}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-text-primary">최근 심사·감사 내역</h2>
            <p className="mt-1 text-xs text-text-muted">운영 결정의 요약만 표시합니다.</p>
          </div>
          <Link to="/admin/creators" className="text-xs font-bold text-brand-light hover:underline">
            전체 심사 도구 <ExternalLink className="ml-1 inline h-3.5 w-3.5" />
          </Link>
        </div>
        {overview.recentAudits.length === 0 ? (
          <p className="mt-5 rounded-xl bg-surface p-4 text-xs text-text-muted">
            아직 감사 기록이 없습니다.
          </p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {overview.recentAudits.map((audit, index) => (
              <div key={`${audit.createdAt}-${index}`} className="rounded-xl bg-surface p-3">
                <p className="text-[10px] font-bold text-text-muted">
                  {audit.platform ?? "Creator"}
                </p>
                <p className="mt-1 text-xs font-bold text-text-primary">{audit.action}</p>
                <p className="mt-1 text-[10px] text-text-muted">
                  {audit.createdAt.replace("T", " ").slice(0, 16)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "yellow" | "purple" | "green" | "red" | "blue";
}) {
  const colors = {
    yellow: "text-accent-yellow bg-accent-yellow/10",
    purple: "text-accent-purple bg-accent-purple/10",
    green: "text-accent-green bg-accent-green/10",
    red: "text-accent-red bg-accent-red/10",
    blue: "text-brand-light bg-brand/10",
  };
  return (
    <article className="rounded-2xl border border-border bg-surface-raised p-4 shadow-lg shadow-black/10">
      <div className={`mb-4 inline-flex rounded-xl p-2 ${colors[tone]}`}>{icon}</div>
      <p className="text-[11px] font-bold text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-black text-text-primary">{value}</p>
    </article>
  );
}

function PageMessage({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-xl px-4 py-24 text-center">{children}</div>;
}
