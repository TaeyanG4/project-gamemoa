import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Loader2, ShieldAlert, UserCog, UserPlus, UserX } from "lucide-react";
import { useAuth } from "../features/auth";
import {
  fetchGameDevelopers,
  postGrantGameDeveloper,
  postRevokeGameDeveloper,
} from "../features/adminApi";
import type { GameDeveloperListResponse } from "@owogg/contracts";
import { ApiClientError } from "../lib/api";

export function meta() {
  return [
    { title: "게임 제작자 임명 | OwOGG" },
    { name: "description", content: "샌드박스 게임 업로드 권한을 가진 게임 제작자 관리" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

export default function AdminGameDevelopersRoute() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<GameDeveloperListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userIdInput, setUserIdInput] = useState("");
  const [granting, setGranting] = useState(false);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const load = async () => {
    setError(null);
    try {
      setData(await fetchGameDevelopers());
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        setAccessDenied(true);
        setError(
          err.code === "ADMIN_SESSION_REQUIRED"
            ? "관리자 로그인이 필요합니다. /admin 에서 본인 확인을 먼저 완료해주세요."
            : "이 페이지는 지정된 OwOGG 관리자만 사용할 수 있습니다.",
        );
      } else {
        setError(err instanceof Error ? err.message : "목록을 불러올 수 없습니다.");
      }
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) void load();
  }, [authLoading, isAuthenticated]);

  const handleGrant = async (e: FormEvent) => {
    e.preventDefault();
    const userId = Number(userIdInput.trim());
    if (!Number.isInteger(userId) || userId <= 0) {
      setError("유효한 사용자 ID를 입력하세요.");
      return;
    }
    setGranting(true);
    setError(null);
    try {
      await postGrantGameDeveloper(userId);
      setUserIdInput("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "임명에 실패했습니다.");
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (userId: number) => {
    setBusyUserId(userId);
    setError(null);
    try {
      await postRevokeGameDeveloper(userId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "해제에 실패했습니다.");
    } finally {
      setBusyUserId(null);
    }
  };

  if (authLoading) return <PageMessage>접근 권한을 확인하는 중...</PageMessage>;

  if (!isAuthenticated) {
    return (
      <PageMessage>
        게임 제작자 관리 도구를 사용하려면 <Link to="/profile">OwOGG 로그인</Link>이 필요합니다.
      </PageMessage>
    );
  }

  if (accessDenied) {
    return (
      <PageMessage>
        <h1 className="text-lg font-black text-text-primary">접근 권한이 없습니다</h1>
        <p className="mt-2 text-sm text-text-muted">
          지정된 OwOGG 관리자 계정만 게임 제작자를 임명할 수 있습니다.
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
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:px-8">
      <header>
        <div className="mb-2 flex items-center gap-2 text-accent-yellow">
          <ShieldAlert className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Admin Safety</span>
        </div>
        <h1 className="text-2xl font-black text-text-primary">게임 제작자 임명</h1>
        <p className="mt-1 text-xs text-text-muted">
          V1은 임명제입니다 — 여기서 임명된 사용자만 설정의 "개발" 탭에서 샌드박스 게임을 업로드할
          수 있습니다. 기존 유저는 임명 전까지 접근할 수 없습니다.
        </p>
      </header>

      <form
        onSubmit={(e) => void handleGrant(e)}
        className="flex items-end gap-2 rounded-2xl border border-border bg-surface-raised p-4"
      >
        <div className="flex-1 space-y-1.5">
          <label htmlFor="grant-user-id" className="block text-[11px] font-bold text-text-muted">
            사용자 ID
          </label>
          <input
            id="grant-user-id"
            type="text"
            inputMode="numeric"
            value={userIdInput}
            onChange={(e) => setUserIdInput(e.target.value)}
            placeholder="예: 42"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <button
          type="submit"
          disabled={granting || !userIdInput.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light disabled:opacity-50"
        >
          {granting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          임명
        </button>
      </form>

      {error && (
        <div className="rounded-2xl border border-accent-red/30 bg-accent-red/10 p-4 text-xs text-accent-red">
          {error}
        </div>
      )}

      {!data ? (
        <PageMessage small>목록을 불러오는 중...</PageMessage>
      ) : data.developers.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface-raised p-6 text-center text-xs text-text-muted">
          아직 임명된 게임 제작자가 없습니다.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface-raised">
          {data.developers.map((dev) => {
            const busy = busyUserId === dev.userId;
            const active = dev.status === "ACTIVE";
            return (
              <div key={dev.userId} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-brand-light" />
                  <span className="text-sm font-bold text-text-primary">#{dev.userId}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      active
                        ? "bg-accent-green/10 text-accent-green"
                        : "bg-accent-red/10 text-accent-red"
                    }`}
                  >
                    {active ? "활성" : "해제됨"}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    임명: {dev.createdAt.split("T")[0]}
                  </span>
                </div>
                {active && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRevoke(dev.userId)}
                    className="flex items-center gap-1.5 rounded-xl border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-xs font-bold text-accent-red hover:bg-accent-red/20 disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserX className="h-3.5 w-3.5" />
                    )}
                    해제
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
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
