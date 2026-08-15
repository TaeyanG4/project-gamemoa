import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import {
  Ban,
  Clock,
  History,
  Loader2,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserX,
} from "lucide-react";
import { useAuth } from "../features/auth";
import {
  fetchAdminUserSearch,
  fetchAdminUserDetail,
  postSuspendUser,
  postBanUser,
  postUnsuspendUser,
  postScoreSubmissionBlock,
  postResetUserScores,
  postRestoreUserScores,
} from "../features/adminApi";
import type { AdminUserSearchResult, AdminUserDetailResponse } from "@owogg/contracts";
import { ApiClientError } from "../lib/api";

export function meta() {
  return [
    { title: "유저 관리 | OwOGG" },
    { name: "description", content: "OwOGG 사용자 검색, 정지/밴, 점수 제출 차단 및 롤백" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-accent-green/10 text-accent-green",
  SUSPENDED: "bg-accent-yellow/10 text-accent-yellow",
  BANNED: "bg-accent-red/10 text-accent-red",
};

const ACTION_LABEL: Record<string, string> = {
  SUSPENDED: "임시정지",
  BANNED: "영구정지",
  UNSUSPENDED: "정지 해제",
  SCORE_SUBMISSION_BLOCKED: "점수 제출 차단",
  SCORE_SUBMISSION_UNBLOCKED: "점수 제출 차단 해제",
  SCORES_RESET: "점수 초기화",
  SCORES_RESTORED: "점수 복구",
};

export default function AdminUsersRoute() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUserSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminUserDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const res = await fetchAdminUserSearch(query);
      setResults(res.users);
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        setAccessDenied(true);
      }
      setError(err instanceof Error ? err.message : "검색에 실패했습니다.");
    } finally {
      setSearching(false);
    }
  };

  const loadDetail = async (userId: number) => {
    setSelectedId(userId);
    setLoadingDetail(true);
    setError(null);
    try {
      setDetail(await fetchAdminUserDetail(userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "사용자 정보를 불러올 수 없습니다.");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Every mutating action follows the same shape: run it, then reload this user's detail (and
  // the search row, if visible) so the UI never shows stale moderation state after a click.
  const runAction = async (action: () => Promise<unknown>) => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      await loadDetail(selectedId);
      if (results) {
        try {
          setResults((await fetchAdminUserSearch(query)).users);
        } catch {
          // Non-critical — the detail panel above is already up to date.
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "작업에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) {
    return <PageMessage>접근 권한을 확인하는 중...</PageMessage>;
  }

  if (!isAuthenticated) {
    return (
      <PageMessage>
        유저 관리 도구를 사용하려면 <Link to="/profile">OwOGG 로그인</Link>이 필요합니다.
      </PageMessage>
    );
  }

  if (accessDenied) {
    return (
      <PageMessage>
        <h1 className="text-lg font-black text-text-primary">접근 권한이 없습니다</h1>
        <p className="mt-2 text-sm text-text-muted">
          지정된 OwOGG 관리자 계정만 유저 관리 도구를 사용할 수 있습니다.
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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 md:px-8">
      <header>
        <div className="mb-2 flex items-center gap-2 text-accent-yellow">
          <ShieldAlert className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Admin Safety</span>
        </div>
        <h1 className="text-2xl font-black text-text-primary">유저 관리</h1>
        <p className="mt-1 text-xs text-text-muted">
          닉네임/이메일 일부 또는 정확한 사용자 ID로 검색하세요. 정지/밴/점수 관련 조치는 모두
          사유가 필수이며 감사 로그에 영구 기록됩니다.
        </p>
      </header>

      <form onSubmit={(e) => void handleSearch(e)} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="닉네임, 이메일 일부, 또는 사용자 ID"
            className="w-full rounded-xl border border-border bg-surface-raised py-2.5 pl-10 pr-4 text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light disabled:opacity-50"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "검색"}
        </button>
      </form>

      {error && (
        <div className="rounded-2xl border border-accent-red/30 bg-accent-red/10 p-4 text-xs text-accent-red">
          {error}
        </div>
      )}

      {results && (
        <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface-raised">
          {results.length === 0 ? (
            <p className="p-4 text-xs text-text-muted">검색 결과가 없습니다.</p>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => void loadDetail(u.id)}
                className={`flex items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-surface-overlay ${
                  selectedId === u.id ? "bg-surface-overlay" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold text-text-primary">
                      {u.nickname}
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-text-muted">#{u.id}</span>
                  </div>
                  {u.email && <p className="truncate text-[11px] text-text-muted">{u.email}</p>}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[u.moderationStatus]}`}
                >
                  {u.moderationStatus}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {loadingDetail && <PageMessage small>사용자 정보를 불러오는 중...</PageMessage>}

      {detail && !loadingDetail && (
        <UserDetailPanel detail={detail} busy={busy} runAction={runAction} />
      )}
    </div>
  );
}

function UserDetailPanel({
  detail,
  busy,
  runAction,
}: {
  detail: AdminUserDetailResponse;
  busy: boolean;
  runAction: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const [suspendDays, setSuspendDays] = useState(7);
  const [suspendReason, setSuspendReason] = useState("");
  const [banReason, setBanReason] = useState("");
  const [scoreBlockReason, setScoreBlockReason] = useState("");
  const [resetReason, setResetReason] = useState("");

  const m = detail.moderation;
  const status = m?.status ?? "ACTIVE";
  const scoreBlocked = m?.scoreSubmissionBlocked ?? false;

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface-raised p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-text-primary">{detail.nickname}</h2>
            <span className="text-xs font-bold text-text-muted">#{detail.id}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[status]}`}
            >
              {status}
            </span>
            {scoreBlocked && (
              <span className="rounded-full bg-accent-red/10 px-2 py-0.5 text-[10px] font-bold text-accent-red">
                점수 제출 차단됨
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {detail.email ?? "이메일 없음"} · 가입일 {detail.createdAt.split("T")[0]} · 연동:{" "}
            {detail.providers.length > 0 ? detail.providers.join(", ") : "없음"}
          </p>
          {m?.reason && <p className="mt-1 text-[11px] text-text-muted">최근 사유: {m.reason}</p>}
          {status === "SUSPENDED" && m?.suspendedUntil && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-accent-yellow">
              <Clock className="h-3 w-3" />
              {m.suspendedUntil}까지 정지
            </p>
          )}
        </div>
      </div>

      {/* Game bests — read-only context for the admin, not editable here. */}
      {detail.gameBests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {detail.gameBests.map((b) => (
            <span
              key={b.gameId}
              className="rounded-full bg-surface px-3 py-1 text-[11px] font-bold text-text-secondary"
            >
              {b.gameId}: {b.formattedScore}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 border-t border-border pt-6 md:grid-cols-2">
        {/* Suspend / Ban / Unsuspend */}
        <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
          <h3 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-text-primary">
            <UserX className="h-3.5 w-3.5" /> 계정 정지
          </h3>
          {status === "ACTIVE" ? (
            <>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-text-muted">기간</label>
                <select
                  value={suspendDays}
                  onChange={(e) => setSuspendDays(Number(e.target.value))}
                  className="rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-xs text-text-primary"
                >
                  <option value={1}>1일</option>
                  <option value={3}>3일</option>
                  <option value={7}>7일</option>
                  <option value={30}>30일</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="정지 사유 (필수)"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand"
              />
              <button
                type="button"
                disabled={busy || !suspendReason.trim()}
                onClick={() =>
                  void runAction(() =>
                    postSuspendUser(
                      detail.id,
                      new Date(Date.now() + suspendDays * 86400000).toISOString(),
                      suspendReason,
                    ),
                  )
                }
                className="rounded-lg border border-accent-yellow/30 bg-accent-yellow/10 px-3 py-2 text-xs font-bold text-accent-yellow hover:bg-accent-yellow/20 disabled:opacity-50"
              >
                임시정지 적용
              </button>
              <input
                type="text"
                placeholder="영구정지 사유 (필수)"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand"
              />
              <button
                type="button"
                disabled={busy || !banReason.trim()}
                onClick={() => void runAction(() => postBanUser(detail.id, banReason))}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-xs font-bold text-accent-red hover:bg-accent-red/20 disabled:opacity-50"
              >
                <Ban className="h-3.5 w-3.5" /> 영구정지 적용
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction(() => postUnsuspendUser(detail.id))}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-accent-green/30 bg-accent-green/10 px-3 py-2 text-xs font-bold text-accent-green hover:bg-accent-green/20 disabled:opacity-50"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> 정지/밴 해제
            </button>
          )}
        </div>

        {/* Score-submission block + reset/restore */}
        <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
          <h3 className="text-xs font-black uppercase tracking-wide text-text-primary">
            점수 관리
          </h3>
          {!scoreBlocked ? (
            <>
              <input
                type="text"
                placeholder="점수 제출 차단 사유 (필수)"
                value={scoreBlockReason}
                onChange={(e) => setScoreBlockReason(e.target.value)}
                className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand"
              />
              <button
                type="button"
                disabled={busy || !scoreBlockReason.trim()}
                onClick={() =>
                  void runAction(() => postScoreSubmissionBlock(detail.id, true, scoreBlockReason))
                }
                className="rounded-lg border border-accent-yellow/30 bg-accent-yellow/10 px-3 py-2 text-xs font-bold text-accent-yellow hover:bg-accent-yellow/20 disabled:opacity-50"
              >
                점수 제출 차단 (로그인은 유지)
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction(() => postScoreSubmissionBlock(detail.id, false, null))}
              className="rounded-lg border border-accent-green/30 bg-accent-green/10 px-3 py-2 text-xs font-bold text-accent-green hover:bg-accent-green/20 disabled:opacity-50"
            >
              점수 제출 차단 해제
            </button>
          )}

          <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-3">
            <input
              type="text"
              placeholder="점수 초기화 사유 (필수)"
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value)}
              className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand"
            />
            <button
              type="button"
              disabled={busy || !resetReason.trim()}
              onClick={() => void runAction(() => postResetUserScores(detail.id, resetReason))}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-xs font-bold text-accent-red hover:bg-accent-red/20 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> 이 유저 점수 전체 초기화
            </button>
            <p className="text-[10px] text-text-muted">
              초기화된 점수는 소프트 삭제되어 아래 버튼으로 즉시 복구할 수 있습니다.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction(() => postRestoreUserScores(detail.id))}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-bold text-text-primary hover:border-brand disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 최근 초기화된 점수 복구
            </button>
          </div>
        </div>
      </div>

      {/* Audit log */}
      <div className="border-t border-border pt-6">
        <h3 className="mb-3 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-text-primary">
          <History className="h-3.5 w-3.5" /> 조치 이력
        </h3>
        {detail.auditLog.length === 0 ? (
          <p className="text-xs text-text-muted">아직 조치 이력이 없습니다.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {detail.auditLog.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-3 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-bold text-text-primary">
                    {ACTION_LABEL[entry.action] ?? entry.action}
                  </span>
                  {entry.reason && <span className="ml-2 text-text-muted">— {entry.reason}</span>}
                </div>
                <span className="shrink-0 text-[10px] text-text-muted">
                  {entry.createdAt.split("T")[0]} · admin #{entry.actorAdminId}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PageMessage({ children, small }: { children: React.ReactNode; small?: boolean }) {
  return (
    <div
      className={
        small
          ? "px-4 py-6 text-center text-xs text-text-muted"
          : "mx-auto max-w-xl px-4 py-24 text-center"
      }
    >
      {children}
    </div>
  );
}
