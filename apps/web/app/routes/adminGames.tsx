import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Gamepad2, Loader2, Power, ShieldAlert } from "lucide-react";
import { useAuth } from "../features/auth";
import { fetchAdminGames, postToggleAdminGame } from "../features/adminApi";
import type { AdminGameListResponse } from "@owogg/contracts";
import { ApiClientError } from "../lib/api";

export function meta() {
  return [
    { title: "게임 관리 | OwOGG" },
    { name: "description", content: "OwOGG 게임 활성화/비활성화 관리" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

export default function AdminGamesRoute() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<AdminGameListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyGameId, setBusyGameId] = useState<string | null>(null);

  const loadGames = async () => {
    setError(null);
    try {
      setData(await fetchAdminGames());
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        setAccessDenied(true);
        setError(
          err.code === "ADMIN_SESSION_REQUIRED"
            ? "관리자 로그인이 필요합니다. /admin 에서 본인 확인을 먼저 완료해주세요."
            : "이 페이지는 지정된 OwOGG 관리자만 사용할 수 있습니다.",
        );
      } else {
        setError(err instanceof Error ? err.message : "게임 목록을 불러올 수 없습니다.");
      }
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) void loadGames();
  }, [authLoading, isAuthenticated]);

  const handleToggle = async (gameId: string, nextEnabled: boolean) => {
    // Disabling without a reason is allowed, but strongly discouraged in the UI copy — the
    // reason is what future admins (or the same admin later) see for *why* it was turned off.
    const reason = nextEnabled ? null : (reasons[gameId]?.trim() ?? "") || null;
    setBusyGameId(gameId);
    setError(null);
    try {
      await postToggleAdminGame(gameId, nextEnabled, reason);
      await loadGames();
    } catch (err) {
      setError(err instanceof Error ? err.message : "게임 상태를 변경하지 못했습니다.");
    } finally {
      setBusyGameId(null);
    }
  };

  if (authLoading) {
    return <PageMessage>접근 권한을 확인하는 중...</PageMessage>;
  }

  if (!isAuthenticated) {
    return (
      <PageMessage>
        게임 관리 도구를 사용하려면 <Link to="/profile">OwOGG 로그인</Link>이 필요합니다.
      </PageMessage>
    );
  }

  if (accessDenied) {
    return (
      <PageMessage>
        <h1 className="text-lg font-black text-text-primary">접근 권한이 없습니다</h1>
        <p className="mt-2 text-sm text-text-muted">
          지정된 OwOGG 관리자 계정만 게임을 관리할 수 있습니다.
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
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-accent-yellow">
            <ShieldAlert className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Admin Safety</span>
          </div>
          <h1 className="text-2xl font-black text-text-primary">게임 관리</h1>
          <p className="mt-1 text-xs text-text-muted">
            비활성화하면 카탈로그(홈/전체 게임/랭킹)에서 즉시 숨겨지고, 새 점수 제출도 거부됩니다.
            코드 배포 없이 즉시 적용됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadGames()}
          className="rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs font-bold text-text-primary hover:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
        >
          새로고침
        </button>
      </header>

      {error && (
        <div className="rounded-2xl border border-accent-red/30 bg-accent-red/10 p-4 text-xs text-accent-red">
          {error}
        </div>
      )}

      {!data ? (
        <PageMessage>게임 목록을 불러오는 중...</PageMessage>
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface-raised">
          {data.games.map((game) => {
            const busy = busyGameId === game.gameId;
            return (
              <div
                key={game.gameId}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
              >
                <div className="flex flex-1 items-center gap-3">
                  <Gamepad2 className="h-4 w-4 shrink-0 text-brand-light" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-text-primary">{game.title}</span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-text-muted">
                        {game.gameId}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          game.enabled
                            ? "bg-accent-green/10 text-accent-green"
                            : "bg-accent-red/10 text-accent-red"
                        }`}
                      >
                        {game.enabled ? "활성" : "비활성"}
                      </span>
                    </div>
                    {!game.enabled && game.disabledReason && (
                      <p className="mt-1 text-[11px] text-text-muted">
                        사유: {game.disabledReason}
                      </p>
                    )}
                    {!game.enabled && game.updatedAt && (
                      <p className="mt-0.5 text-[10px] text-text-muted">
                        변경일: {game.updatedAt.split("T")[0] ?? game.updatedAt}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {game.enabled && (
                    <input
                      type="text"
                      placeholder="비활성화 사유 (선택)"
                      value={reasons[game.gameId] ?? ""}
                      onChange={(e) =>
                        setReasons((prev) => ({ ...prev, [game.gameId]: e.target.value }))
                      }
                      className="w-40 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand sm:w-48"
                    />
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleToggle(game.gameId, !game.enabled)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                      game.enabled
                        ? "border-accent-red/30 bg-accent-red/10 text-accent-red hover:bg-accent-red/20"
                        : "border-accent-green/30 bg-accent-green/10 text-accent-green hover:bg-accent-green/20"
                    }`}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Power className="h-3.5 w-3.5" />
                    )}
                    {game.enabled ? "비활성화" : "활성화"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PageMessage({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-xl px-4 py-24 text-center">{children}</div>;
}
