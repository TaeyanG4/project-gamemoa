import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  LogOut,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  fetchAdminMe,
  fetchAdminOverview,
  postAdminGoogleStepUp,
  postAdminLogin,
  postAdminLogout,
} from "../features/adminApi";
import type { AdminMeResponse, AdminOverviewResponse } from "@gamemoa/contracts";
import { ApiClientError } from "../lib/api/errors";
import { useAuth } from "../features/auth";

export function meta() {
  return [
    { title: "관리자 센터 | GAMEMOA" },
    { name: "description", content: "GAMEMOA 관리자 전용 운영 센터" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

type Stage = "loading" | "need-gamemoa-login" | "not-eligible" | "step-up" | "dashboard";

export default function AdminRoute() {
  const { isAuthenticated, isLoading: authLoading, providerStatus, openLoginModal } = useAuth();
  const [me, setMe] = useState<AdminMeResponse | null>(null);
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  // Local, client-only progress within the two-step elevation flow — the server has no
  // concept of "Google done, password pending" outside the short-lived step-up cookie.
  const [googleStepDone, setGoogleStepDone] = useState(false);

  const refreshMe = useCallback(async () => {
    try {
      const next = await fetchAdminMe();
      setMe(next);
      setError(null);
      if (next.adminAuthenticated) {
        const nextOverview = await fetchAdminOverview();
        setOverview(nextOverview);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "관리자 상태를 확인할 수 없습니다.");
    } finally {
      setLoadingMe(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void refreshMe();
  }, [authLoading, refreshMe]);

  let stage: Stage = "loading";
  if (!authLoading && !loadingMe && me) {
    if (!isAuthenticated || !me.authenticated) stage = "need-gamemoa-login";
    else if (!me.eligible) stage = "not-eligible";
    else if (!me.adminAuthenticated) stage = "step-up";
    else stage = "dashboard";
  }

  if (stage === "loading") return <PageMessage>관리자 권한을 확인하는 중...</PageMessage>;

  if (stage === "need-gamemoa-login") {
    return (
      <PageMessage>
        <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-text-muted" />
        <h1 className="text-lg font-black text-text-primary">GAMEMOA 로그인이 필요합니다</h1>
        <p className="mt-2 text-sm text-text-muted">
          관리자 센터는 GAMEMOA 로그인 이후 추가 본인 확인을 거쳐 접근할 수 있습니다.
        </p>
        <button
          onClick={openLoginModal}
          className="mt-6 inline-flex items-center rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer"
        >
          GAMEMOA 로그인
        </button>
      </PageMessage>
    );
  }

  if (stage === "not-eligible") {
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

  if (stage === "step-up") {
    return (
      <StepUpFlow
        googleClientId={providerStatus.google.clientId}
        googleConfigured={providerStatus.google.configured}
        googleStepDone={googleStepDone}
        onGoogleStepDone={() => setGoogleStepDone(true)}
        onLoggedIn={() => void refreshMe()}
      />
    );
  }

  if (!overview) return <PageMessage>관리자 요약을 불러올 수 없습니다.</PageMessage>;

  return <AdminDashboard overview={overview} onLoggedOut={() => void refreshMe()} />;
}

// ---------------------------------------------------------------------------
// Step 1 — Google 계정으로 관리자 본인 확인 / Step 2 — 관리자 계정 로그인
// ---------------------------------------------------------------------------

function StepUpFlow({
  googleClientId,
  googleConfigured,
  googleStepDone,
  onGoogleStepDone,
  onLoggedIn,
}: {
  googleClientId?: string | undefined;
  googleConfigured: boolean;
  googleStepDone: boolean;
  onGoogleStepDone: () => void;
  onLoggedIn: () => void;
}) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleGoogleStepUp = () => {
    if (googleLoading) return;
    if (!googleClientId || !googleConfigured) {
      setGoogleError("Google 로그인이 아직 설정되지 않았습니다.");
      return;
    }
    if (!window.google?.accounts?.id) {
      setGoogleError("Google 로그인 스크립트가 로드되지 않았습니다. 페이지를 새로고침해주세요.");
      return;
    }

    setGoogleError(null);
    setGoogleLoading(true);
    const googleAuth = window.google.accounts.id;

    googleAuth.initialize({
      client_id: googleClientId,
      callback: async (response: { credential: string }) => {
        try {
          await postAdminGoogleStepUp(response.credential);
          onGoogleStepDone();
        } catch (err) {
          setGoogleError(
            err instanceof ApiClientError
              ? err.detail || "Google 본인 확인에 실패했습니다."
              : "Google 본인 확인에 실패했습니다.",
          );
        } finally {
          setGoogleLoading(false);
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    googleAuth.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        const tempDiv = document.createElement("div");
        tempDiv.style.position = "fixed";
        tempDiv.style.top = "-9999px";
        document.body.appendChild(tempDiv);
        googleAuth.renderButton(tempDiv, { type: "icon", size: "large" });
        const btn = tempDiv.querySelector("div[role=button]") as HTMLElement | null;
        if (btn) btn.click();
        setTimeout(() => {
          document.body.removeChild(tempDiv);
          setGoogleLoading(false);
        }, 5000);
      }
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginLoading) return;
    setLoginError(null);
    setLoginLoading(true);
    try {
      await postAdminLogin(username, password);
      onLoggedIn();
    } catch (err) {
      setLoginError(
        err instanceof ApiClientError
          ? err.detail || "로그인에 실패했습니다."
          : "로그인에 실패했습니다.",
      );
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div className="text-center">
        <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-accent-yellow" />
        <h1 className="text-xl font-black text-text-primary">관리자 본인 확인</h1>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">
          관리자 센터는 두 단계 확인을 모두 통과해야 열립니다.
        </p>
      </div>

      <ol className="flex items-center justify-center gap-2 text-[11px] font-bold text-text-muted">
        <StepBadge
          index={1}
          label="Google 본인 확인"
          active={!googleStepDone}
          done={googleStepDone}
        />
        <span className="text-text-muted">→</span>
        <StepBadge index={2} label="관리자 로그인" active={googleStepDone} done={false} />
      </ol>

      {!googleStepDone ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-5">
          <p className="text-xs text-text-muted">
            평소 로그인 세션과는 별개로, 지금 이 자리에서 Google 계정으로 새로 본인 확인을
            진행합니다.
          </p>
          <button
            onClick={handleGoogleStepUp}
            disabled={googleLoading}
            className="flex items-center justify-center gap-3 rounded-2xl bg-white py-3.5 font-extrabold text-slate-900 shadow-lg transition-all hover:scale-[1.02] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
          >
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-brand" />
            )}
            <span>{googleLoading ? "확인 중..." : "Google 계정으로 관리자 본인 확인"}</span>
          </button>
          {googleError && <p className="text-xs font-semibold text-accent-red">{googleError}</p>}
        </div>
      ) : (
        <form
          onSubmit={handleLogin}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-5"
        >
          <label className="flex flex-col gap-1.5 text-xs font-bold text-text-primary">
            관리자 아이디
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-text-primary outline-none focus:ring-2 focus:ring-brand"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-text-primary">
            관리자 비밀번호
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-text-primary outline-none focus:ring-2 focus:ring-brand"
              required
            />
          </label>
          <button
            type="submit"
            disabled={loginLoading}
            className="mt-1 rounded-xl bg-brand py-3 text-xs font-bold text-white hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {loginLoading ? "로그인 중..." : "관리자 로그인"}
          </button>
          {loginError && <p className="text-xs font-semibold text-accent-red">{loginError}</p>}
        </form>
      )}
    </div>
  );
}

function StepBadge({
  index,
  label,
  active,
  done,
}: {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${
        done
          ? "border-accent-green/30 bg-accent-green/10 text-accent-green"
          : active
            ? "border-brand/40 bg-brand/10 text-brand-light"
            : "border-border bg-surface text-text-muted"
      }`}
    >
      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{index}</span>}
      {label}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Dashboard (post-elevation)
// ---------------------------------------------------------------------------

function AdminDashboard({
  overview,
  onLoggedOut,
}: {
  overview: AdminOverviewResponse;
  onLoggedOut: () => void;
}) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await postAdminLogout();
    } finally {
      setLoggingOut(false);
      onLoggedOut();
    }
  };

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
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-2 text-xs font-bold text-accent-green">
            <CheckCircle2 className="h-4 w-4" /> 관리자 인증됨
          </span>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs font-bold text-text-muted hover:text-text-primary disabled:opacity-50 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> 관리자 로그아웃
          </button>
        </div>
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
