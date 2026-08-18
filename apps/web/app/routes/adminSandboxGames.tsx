import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import {
  Check,
  Eye,
  EyeOff,
  Gamepad2,
  History,
  Loader2,
  Package,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "../features/auth";
import {
  fetchSandboxReviewQueue,
  fetchAdminSandboxGameDetail,
  postApproveSandboxVersion,
  postRejectSandboxVersion,
  patchSandboxGameMetadata,
  patchSandboxGameVisibility,
  deleteSandboxGame,
} from "../features/adminApi";
import type { SandboxGameReviewQueueResponse, SandboxGameDetailResponse } from "@owogg/contracts";
import { ApiClientError } from "../lib/api";

export function meta() {
  return [
    { title: "제작 게임 심사 | OwOGG" },
    { name: "description", content: "샌드박스 게임 업로드 심사 및 공개 관리" },
    { name: "robots", content: "noindex,nofollow" },
  ];
}

export default function AdminSandboxGamesRoute() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [queue, setQueue] = useState<SandboxGameReviewQueueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [busyVersionId, setBusyVersionId] = useState<number | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<number, string>>({});

  const [gameIdInput, setGameIdInput] = useState("");
  const [detail, setDetail] = useState<SandboxGameDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadQueue = async () => {
    setError(null);
    try {
      setQueue(await fetchSandboxReviewQueue());
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        setAccessDenied(true);
        setError(
          err.code === "ADMIN_SESSION_REQUIRED"
            ? "관리자 로그인이 필요합니다. /admin 에서 본인 확인을 먼저 완료해주세요."
            : "이 페이지는 지정된 OwOGG 관리자만 사용할 수 있습니다.",
        );
      } else {
        setError(err instanceof Error ? err.message : "심사 큐를 불러올 수 없습니다.");
      }
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) void loadQueue();
  }, [authLoading, isAuthenticated]);

  const handleApprove = async (versionId: number) => {
    setBusyVersionId(versionId);
    setError(null);
    try {
      await postApproveSandboxVersion(versionId);
      await loadQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : "승인에 실패했습니다.");
    } finally {
      setBusyVersionId(null);
    }
  };

  const handleReject = async (versionId: number) => {
    const reason = rejectReasons[versionId]?.trim();
    if (!reason) {
      setError("반려 사유를 입력하세요.");
      return;
    }
    setBusyVersionId(versionId);
    setError(null);
    try {
      await postRejectSandboxVersion(versionId, reason);
      setRejectReasons((prev) =>
        Object.fromEntries(Object.entries(prev).filter(([id]) => Number(id) !== versionId)),
      );
      await loadQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : "반려에 실패했습니다.");
    } finally {
      setBusyVersionId(null);
    }
  };

  const handleLoadGame = async (e: FormEvent) => {
    e.preventDefault();
    const id = Number(gameIdInput.trim());
    if (!Number.isInteger(id) || id <= 0) {
      setError("유효한 게임 ID를 입력하세요.");
      return;
    }
    setLoadingDetail(true);
    setError(null);
    try {
      setDetail(await fetchAdminSandboxGameDetail(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "게임 정보를 불러올 수 없습니다.");
    } finally {
      setLoadingDetail(false);
    }
  };

  if (authLoading) return <PageMessage>접근 권한을 확인하는 중...</PageMessage>;

  if (!isAuthenticated) {
    return (
      <PageMessage>
        게임 심사 도구를 사용하려면 <Link to="/profile">OwOGG 로그인</Link>이 필요합니다.
      </PageMessage>
    );
  }

  if (accessDenied) {
    return (
      <PageMessage>
        <h1 className="text-lg font-black text-text-primary">접근 권한이 없습니다</h1>
        <p className="mt-2 text-sm text-text-muted">
          지정된 OwOGG 관리자 계정만 게임을 심사할 수 있습니다.
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
        <h1 className="text-2xl font-black text-text-primary">제작 게임 심사</h1>
        <p className="mt-1 text-xs text-text-muted">
          버전 승인은 게임을 공개하지 않습니다 — 승인 후에도 기본은 비공개이며, 아래 "공개 전환"을
          별도로 눌러야 실제로 서비스가 시작됩니다.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-accent-red/30 bg-accent-red/10 p-4 text-xs text-accent-red">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
          <Package className="h-4 w-4" /> 심사 대기 ({queue?.total ?? 0})
        </h2>
        {!queue ? (
          <PageMessage small>불러오는 중...</PageMessage>
        ) : queue.entries.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface-raised p-6 text-center text-xs text-text-muted">
            대기 중인 심사가 없습니다.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {queue.entries.map((entry) => {
              const busy = busyVersionId === entry.version.id;
              return (
                <div
                  key={entry.version.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-text-primary">
                        {entry.gameTitle}{" "}
                        <span className="text-[10px] font-bold text-text-muted">
                          #{entry.gameId} · {entry.gameSlug}
                        </span>
                      </p>
                      <p className="text-[11px] text-text-muted">
                        제작자 #{entry.developerUserId} · 업로드{" "}
                        {entry.version.uploadedAt.split("T")[0]} ·{" "}
                        {(entry.version.bundleBytes / 1024 / 1024).toFixed(1)}MB
                      </p>
                    </div>
                    <span className="rounded-full bg-accent-yellow/10 px-2 py-0.5 text-[10px] font-bold text-accent-yellow">
                      {entry.version.status === "PENDING_REVIEW"
                        ? "심사 대기"
                        : entry.version.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleApprove(entry.version.id)}
                      className="flex items-center gap-1.5 rounded-xl border border-accent-green/30 bg-accent-green/10 px-3 py-2 text-xs font-bold text-accent-green hover:bg-accent-green/20 disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      승인
                    </button>
                    <input
                      type="text"
                      placeholder="반려 사유 (필수)"
                      value={rejectReasons[entry.version.id] ?? ""}
                      onChange={(e) =>
                        setRejectReasons((prev) => ({
                          ...prev,
                          [entry.version.id]: e.target.value,
                        }))
                      }
                      className="min-w-[180px] flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand"
                    />
                    <button
                      type="button"
                      disabled={busy || !rejectReasons[entry.version.id]?.trim()}
                      onClick={() => void handleReject(entry.version.id)}
                      className="flex items-center gap-1.5 rounded-xl border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-xs font-bold text-accent-red hover:bg-accent-red/20 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      반려
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
          <Gamepad2 className="h-4 w-4" /> 게임 메타데이터 / 공개 관리
        </h2>
        <form onSubmit={(e) => void handleLoadGame(e)} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              inputMode="numeric"
              value={gameIdInput}
              onChange={(e) => setGameIdInput(e.target.value)}
              placeholder="게임 ID (심사 큐의 # 뒤 번호)"
              className="w-full rounded-xl border border-border bg-surface-raised py-2.5 pl-10 pr-4 text-sm text-text-primary outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            disabled={loadingDetail}
            className="rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light disabled:opacity-50"
          >
            {loadingDetail ? <Loader2 className="h-4 w-4 animate-spin" /> : "불러오기"}
          </button>
        </form>

        {detail && <GameDetailPanel detail={detail} onChanged={setDetail} onError={setError} />}
      </section>
    </div>
  );
}

function GameDetailPanel({
  detail,
  onChanged,
  onError,
}: {
  detail: SandboxGameDetailResponse;
  onChanged: (detail: SandboxGameDetailResponse) => void;
  onError: (message: string) => void;
}) {
  const { game } = detail;
  const [title, setTitle] = useState(game.title);
  const [shortDescription, setShortDescription] = useState(game.shortDescription ?? "");
  const [description, setDescription] = useState(game.description ?? "");
  const [genre, setGenre] = useState(game.genre);
  const [xp, setXp] = useState(String(game.xpPerCompletion));
  const [scoreUnit, setScoreUnit] = useState(game.scoreUnit ?? "");
  const [scoreDirection, setScoreDirection] = useState(game.scoreDirection ?? "");
  const [scoreMin, setScoreMin] = useState(game.scoreMin === null ? "" : String(game.scoreMin));
  const [scoreMax, setScoreMax] = useState(game.scoreMax === null ? "" : String(game.scoreMax));
  const [saving, setSaving] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSaveMetadata = async () => {
    setSaving(true);
    onError("");
    try {
      const game2 = await patchSandboxGameMetadata(game.id, {
        title,
        shortDescription: shortDescription || null,
        description: description || null,
        genre,
        xpPerCompletion: Number(xp) || 0,
        scoreUnit: scoreUnit || null,
        scoreDirection: (scoreDirection || null) as "asc" | "desc" | null,
        scoreMin: scoreMin === "" ? null : Number(scoreMin),
        scoreMax: scoreMax === "" ? null : Number(scoreMax),
      });
      onChanged({ ...detail, game: game2 });
    } catch (err) {
      onError(err instanceof Error ? err.message : "메타데이터 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async () => {
    setTogglingVisibility(true);
    onError("");
    try {
      const game2 = await patchSandboxGameVisibility(
        game.id,
        game.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC",
      );
      onChanged({ ...detail, game: game2 });
    } catch (err) {
      onError(err instanceof Error ? err.message : "공개 상태 변경에 실패했습니다.");
    } finally {
      setTogglingVisibility(false);
    }
  };

  // ADMIN/OPERATOR only (sandbox_games.delete) — enforced server-side; a MODERATOR who reaches
  // this page (they hold sandbox_games.review) sees the button but gets a 403 from the API if
  // they click it, surfaced the same way any other action-level failure is here.
  const handleDelete = async () => {
    if (deleting) return;
    if (
      !window.confirm(
        `"${game.title}" 게임을 삭제할까요? 즉시 비공개로 전환되며, 심사 중이던 제출도 함께 철회됩니다.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    onError("");
    try {
      const game2 = await deleteSandboxGame(game.id);
      onChanged({ ...detail, game: game2 });
    } catch (err) {
      onError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface-raised p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-text-primary">{game.title}</h3>
            <span className="text-xs font-bold text-text-muted">
              #{game.id} · {game.slug}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-text-muted">
            제작자 #{game.developerUserId} · 등록일 {game.createdAt.split("T")[0]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={
              togglingVisibility ||
              game.deletedAt !== null ||
              (game.visibility === "PRIVATE" && game.liveVersionId === null)
            }
            onClick={() => void handleToggleVisibility()}
            title={
              game.liveVersionId === null
                ? "승인된 버전이 있어야 공개로 전환할 수 있습니다."
                : undefined
            }
            className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-bold disabled:opacity-40 ${
              game.visibility === "PUBLIC"
                ? "border-accent-green/30 bg-accent-green/10 text-accent-green hover:bg-accent-green/20"
                : "border-border bg-surface text-text-primary hover:border-brand"
            }`}
          >
            {togglingVisibility ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : game.visibility === "PUBLIC" ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
            {game.visibility === "PUBLIC" ? "공개 중 (클릭 시 비공개)" : "비공개 (클릭 시 공개 전환)"}
          </button>
          <button
            type="button"
            disabled={deleting || game.deletedAt !== null}
            onClick={() => void handleDelete()}
            className="flex items-center gap-1.5 rounded-xl border border-accent-red/30 bg-accent-red/10 px-4 py-2.5 text-xs font-bold text-accent-red hover:bg-accent-red/20 disabled:opacity-40"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {game.deletedAt !== null ? "삭제됨" : "게임 삭제"}
          </button>
        </div>
      </div>

      {game.deletedAt !== null && (
        <p className="rounded-xl border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-[11px] font-semibold text-accent-red">
          이 게임은 {game.deletedAt.split("T")[0]}에 삭제되었습니다 (관리자 #{game.deletedByAdminId}).
          더 이상 플레이어에게 제공되지 않습니다.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <LabeledField label="제목">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand"
          />
        </LabeledField>
        <LabeledField label="장르">
          <input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="예: 슈터, 퍼즐, 캐주얼"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand"
          />
        </LabeledField>
        <LabeledField label="짧은 설명">
          <input
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand"
          />
        </LabeledField>
        <LabeledField label="완료 시 지급 XP">
          <input
            type="number"
            min={0}
            value={xp}
            onChange={(e) => setXp(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand"
          />
        </LabeledField>
        <LabeledField label="상세 설명">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand"
          />
        </LabeledField>
        <LabeledField label="점수 단위">
          <input
            value={scoreUnit}
            onChange={(e) => setScoreUnit(e.target.value)}
            placeholder="예: ms, 점"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand"
          />
        </LabeledField>
        <LabeledField label="랭크 정렬 방향">
          <select
            value={scoreDirection}
            onChange={(e) => setScoreDirection(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-primary"
          >
            <option value="">미설정</option>
            <option value="asc">낮을수록 우수 (asc)</option>
            <option value="desc">높을수록 우수 (desc)</option>
          </select>
        </LabeledField>
        <div className="grid grid-cols-2 gap-3">
          <LabeledField label="점수 최소">
            <input
              type="number"
              value={scoreMin}
              onChange={(e) => setScoreMin(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand"
            />
          </LabeledField>
          <LabeledField label="점수 최대">
            <input
              type="number"
              value={scoreMax}
              onChange={(e) => setScoreMax(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text-primary outline-none focus:ring-2 focus:ring-brand"
            />
          </LabeledField>
        </div>
      </div>

      <button
        type="button"
        disabled={saving || game.deletedAt !== null}
        onClick={() => void handleSaveMetadata()}
        className="w-full rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-light disabled:opacity-50"
      >
        {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "메타데이터 저장"}
      </button>

      <div className="border-t border-border pt-4">
        <h4 className="mb-2 text-xs font-black uppercase tracking-wide text-text-primary">
          버전 이력
        </h4>
        <div className="flex flex-col divide-y divide-border/60">
          {detail.versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between py-2 text-xs">
              <span className="text-text-muted">
                {v.uploadedAt.split("T")[0]} · {(v.bundleBytes / 1024 / 1024).toFixed(1)}MB
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  v.status === "APPROVED"
                    ? "bg-accent-green/10 text-accent-green"
                    : v.status === "REJECTED"
                      ? "bg-accent-red/10 text-accent-red"
                      : "bg-accent-yellow/10 text-accent-yellow"
                }`}
              >
                {v.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {detail.auditLog.length > 0 && (
        <div className="border-t border-border pt-4">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-text-primary">
            <History className="h-3.5 w-3.5" /> 조치 이력
          </h4>
          <div className="flex flex-col divide-y divide-border/60">
            {detail.auditLog.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2 text-xs">
                <span className="text-text-primary">
                  {entry.action}
                  {entry.reason && <span className="ml-2 text-text-muted">— {entry.reason}</span>}
                </span>
                <span className="text-[10px] text-text-muted">
                  {entry.createdAt.split("T")[0]} · admin #{entry.actorAdminId}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LabeledField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold text-text-muted">{label}</label>
      {children}
    </div>
  );
}

function PageMessage({ children, small }: { children: ReactNode; small?: boolean }) {
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
