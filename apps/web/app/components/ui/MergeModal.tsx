import { useEffect, useState } from "react";
import { X, AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { fetchMergePreview, confirmAccountMerge } from "../../features/auth/authService";
import type { MergePreview, SocialProvider } from "@owogg/contracts";

interface MergeModalProps {
  challengeId: string;
  onClose: () => void;
  onMerged: (primaryId: number) => void;
}

function formatProviderLabel(provider: string): string {
  if (provider === "google") return "Google";
  if (provider === "discord") return "Discord";
  return provider;
}

function AccountCard({
  preview,
  selected,
  onSelect,
}: {
  preview: MergePreview;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-5 rounded-2xl border-2 transition-all cursor-pointer ${
        selected
          ? "border-brand bg-brand/10 shadow-lg shadow-brand/20"
          : "border-border bg-surface hover:border-brand/40"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-extrabold text-text-primary text-lg">{preview.nickname}</span>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-brand/10 text-brand border border-brand/20 uppercase">
          {formatProviderLabel(preview.provider)}
        </span>
      </div>
      <p className="text-[11px] text-text-muted mb-3">
        가입일: {preview.createdAt?.split("T")[0] ?? "-"}
      </p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-surface p-2">
          <div className="text-base font-black text-text-primary">{preview.scoreCount}</div>
          <div className="text-[10px] text-text-muted font-bold">게임 기록</div>
        </div>
        <div className="rounded-xl bg-surface p-2">
          <div className="text-base font-black text-text-primary">{preview.favoriteCount}</div>
          <div className="text-[10px] text-text-muted font-bold">즐겨찾기</div>
        </div>
        <div className="rounded-xl bg-surface p-2">
          <div className="text-base font-black text-text-primary">{preview.recentPlayCount}</div>
          <div className="text-[10px] text-text-muted font-bold">최근 플레이</div>
        </div>
      </div>
    </button>
  );
}

export function MergeModal({ challengeId, onClose, onMerged }: MergeModalProps) {
  const [previews, setPreviews] = useState<{ userA: MergePreview; userB: MergePreview } | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [keepUserId, setKeepUserId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMergePreview(challengeId)
      .then((data) => {
        if (!cancelled) setPreviews(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "통합 정보를 불러오지 못했습니다.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [challengeId]);

  const handleConfirm = async () => {
    if (keepUserId === null) return;
    setConfirming(true);
    setError(null);
    try {
      const result = await confirmAccountMerge(challengeId, keepUserId);
      onMerged(result.primaryId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "계정 통합에 실패했습니다.");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface-raised border border-border rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-surface-overlay transition-colors cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand" />
            <h2 className="text-xl font-extrabold text-text-primary">계정 통합</h2>
          </div>
          <p className="text-xs text-text-secondary">
            두 개의 OwOGG 계정이 각각 존재합니다. 유지할 계정(Primary)을 선택해주세요.
          </p>
        </div>

        {loadError && (
          <div className="px-4 py-3 rounded-2xl bg-accent-red/10 border border-accent-red/30 text-accent-red text-xs font-semibold">
            {loadError}
          </div>
        )}

        {previews && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AccountCard
                preview={previews.userA}
                selected={keepUserId === previews.userA.userId}
                onSelect={() => setKeepUserId(previews.userA.userId)}
              />
              <AccountCard
                preview={previews.userB}
                selected={keepUserId === previews.userB.userId}
                onSelect={() => setKeepUserId(previews.userB.userId)}
              />
            </div>

            {keepUserId !== null && (
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2 px-4 py-4 rounded-2xl bg-accent-yellow/10 border border-accent-yellow/30 text-accent-yellow">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-semibold leading-relaxed">
                    선택하지 않은 계정의 게임 기록, 랭킹 기록, 즐겨찾기 및 개인화 데이터는
                    삭제됩니다. 삭제되는 계정의 Google/Discord 로그인 수단은 유지되는 계정으로
                    연결됩니다. 이 작업은 되돌릴 수 없습니다.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="w-full py-3.5 bg-accent-red hover:bg-accent-red/90 text-white font-extrabold rounded-2xl transition-all shadow-lg shadow-accent-red/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>통합 처리 중...</span>
                    </>
                  ) : (
                    "삭제 후 통합 확정"
                  )}
                </button>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 rounded-2xl bg-accent-red/10 border border-accent-red/30 text-accent-red text-xs font-semibold">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export type { SocialProvider };
