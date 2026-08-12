import { useEffect, useState, useMemo, useCallback, type ComponentType } from "react";
import { useParams, useNavigate } from "react-router";
import { loadGame, gameManifests } from "../features/catalog/registry";
import {
  formatScore,
  type GameRuntimeContext,
  type GameResult,
  type GameProps,
} from "@gamemoa/game-sdk";
import { saveLocalBestScore, submitScoreApi } from "../features/scores/api";
import { useAuth } from "../features/auth";
import { usePersonalization } from "../features/personalization";
import { ArrowLeft, AlertCircle, RefreshCw, CheckCircle2, UserCheck } from "lucide-react";

type SubmissionState = "idle" | "guest" | "submitting" | "success" | "error";

function formatMetadataKey(key: string): string {
  const map: Record<string, string> = {
    wpm: "속도 (WPM)",
    cpm: "타수 (CPM)",
    accuracy: "정확도",
    correctChars: "정타",
    incorrectChars: "오타",
    totalTypedChars: "총 입력 타수",
    durationMs: "소요 시간 (ms)",
    targetsHit: "적중 타겟",
    misses: "실패 타겟",
    level: "달성 레벨",
  };
  return map[key] ?? key;
}

function formatMetadataValue(key: string, value: unknown): string {
  if (key === "accuracy" && typeof value === "number") {
    return `${value}%`;
  }
  return String(value);
}

export default function GamePlay() {
  const params = useParams();
  const navigate = useNavigate();
  const slug = params.slug ?? "";
  const { user, isAuthenticated, openLoginModal } = useAuth();

  const [GameComponent, setGameComponent] = useState<ComponentType<GameProps> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<GameResult | null>(null);

  // Attempt Lifecycle State & Auth Eligibility
  const [attemptKey, setAttemptKey] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [rankingEligible, setRankingEligible] = useState<boolean>(() => isAuthenticated);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const manifest = useMemo(() => gameManifests.find((m) => m.slug === slug), [slug]);

  // Load Game Module
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        setIsLoading(true);
        setError(null);
        const module = await loadGame(slug);

        if (!isMounted) return;

        if (!module) {
          setError("게임을 찾을 수 없습니다.");
        } else {
          setGameComponent(() => module.Game);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load game:", err);
          setError("게임을 불러오는 중 오류가 발생했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void init();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Handle Score Submission (Authenticated Attempts Only)
  const handleScoreSubmission = useCallback(
    async (scoreToSubmit: number) => {
      setSubmissionState("submitting");
      setSubmissionError(null);

      try {
        const payload: { gameId: string; score: number; nickname?: string } = {
          gameId: slug,
          score: scoreToSubmit,
        };

        const res = await submitScoreApi(payload);

        if (res && res.success) {
          setSubmissionState("success");
        } else {
          setSubmissionState("error");
          setSubmissionError("점수 저장에 실패했습니다.");
        }
      } catch {
        setSubmissionState("error");
        setSubmissionError("네트워크 오류로 점수를 저장하지 못했습니다.");
      }
    },
    [slug],
  );

  // Reset / Retry Game Attempt
  const handleRetryGame = useCallback(() => {
    setResult(null);
    setSubmissionState("idle");
    setSubmissionError(null);
    setRankingEligible(isAuthenticated);
    setSessionId(crypto.randomUUID());
    setAttemptKey((prev) => prev + 1);
  }, [isAuthenticated]);

  const { recordRecentPlay } = usePersonalization();

  // Game Runtime Context
  const runtime = useMemo<GameRuntimeContext>(
    () => ({
      sessionId,
      user: user ? { id: String(user.id), displayName: user.nickname } : null,
      emit: (event) => {
        if (event && event.type === "game_started") {
          void recordRecentPlay(slug);
        }
      },
      complete: async (gameResult) => {
        setResult(gameResult);

        const lowerIsBetter = manifest?.scoreConfig?.direction === "asc";
        saveLocalBestScore(slug, gameResult.score, lowerIsBetter);

        if (rankingEligible) {
          await handleScoreSubmission(gameResult.score);
        } else {
          setSubmissionState("guest");
        }
      },
      cancel: () => {
        void navigate("/games");
      },
    }),
    [
      sessionId,
      user,
      navigate,
      slug,
      manifest,
      rankingEligible,
      handleScoreSubmission,
      recordRecentPlay,
    ],
  );

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center flex-1 select-none">
        <AlertCircle className="w-16 h-16 text-accent-red mb-6" />
        <h2 className="text-2xl font-bold mb-4">{error}</h2>
        <button
          type="button"
          onClick={() => void navigate("/games")}
          className="px-6 py-3 bg-surface-raised border border-border rounded-lg hover:bg-surface-overlay transition-colors cursor-pointer"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  // Auth Protection Enforcer
  const isAuthBlocked = manifest?.requiresAuth && !isAuthenticated;

  return (
    <div className="flex flex-col flex-1 bg-[#09090b] select-none">
      {/* Game Header */}
      <div className="h-14 border-b border-border bg-surface flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => void navigate("/games")}
            className="p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">돌아가기</span>
          </button>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-md"
              style={{ backgroundColor: manifest?.accent ?? "#6366f1" }}
            />
            <span className="font-bold">{manifest?.title ?? "게임 로딩중..."}</span>
          </div>
        </div>
      </div>

      {/* Game Area Container */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
            <p className="text-text-secondary font-medium animate-pulse">게임을 불러오는 중...</p>
          </div>
        ) : isAuthBlocked ? (
          <div className="w-full max-w-md bg-surface-raised rounded-3xl border border-border p-8 text-center shadow-2xl flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand/10 text-brand flex items-center justify-center">
              <UserCheck className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black text-text-primary">로그인이 필요한 게임입니다</h3>
            <p className="text-sm text-text-secondary">
              이 미니게임은 계정 로그인 후 플레이 및 랭킹 등록이 가능합니다.
            </p>
            <button
              onClick={openLoginModal}
              className="w-full py-3 bg-brand text-white font-extrabold rounded-2xl shadow-lg shadow-brand/30 hover:scale-105 transition-all cursor-pointer mt-2"
            >
              로그인하고 플레이하기
            </button>
          </div>
        ) : GameComponent ? (
          <div className="w-full max-w-6xl bg-surface-raised rounded-xl shadow-2xl overflow-hidden relative border border-border/50">
            {/* Game Result & Score Submission Overlay */}
            {result ? (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-8 text-center">
                <h3 className="text-3xl font-extrabold mb-2 text-white">게임 종료!</h3>
                <div className="mb-6 p-6 bg-surface-raised rounded-2xl border border-border w-full max-w-md">
                  <p className="text-text-secondary text-sm mb-1">
                    {rankingEligible ? "최종 점수" : "기기 최고 기록"}
                  </p>
                  <p className="text-5xl font-black text-brand mb-4">
                    {formatScore(result.score, manifest?.scoreConfig)}
                  </p>

                  {/* Metadata Formatters */}
                  {result.metadata && Object.keys(result.metadata).length > 0 && (
                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/80">
                      {Object.entries(result.metadata).map(([key, value]) => (
                        <div
                          key={key}
                          className="bg-surface/50 p-2.5 rounded-xl border border-border/40"
                        >
                          <p className="text-xs text-text-muted font-bold mb-0.5">
                            {formatMetadataKey(key)}
                          </p>
                          <p className="font-extrabold text-text-primary text-sm">
                            {formatMetadataValue(key, value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Score Submission Status Indicator */}
                  <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-center">
                    {submissionState === "guest" && (
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-xs font-bold text-text-secondary">
                          게스트 기록은 이 기기에만 저장됩니다.
                        </span>
                        <span className="text-[11px] text-text-muted">
                          로그인하면 다음 플레이부터 랭킹에 참여할 수 있습니다.
                        </span>
                        <button
                          type="button"
                          onClick={openLoginModal}
                          className="mt-1 px-4 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
                        >
                          로그인
                        </button>
                      </div>
                    )}
                    {submissionState === "submitting" && (
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-brand animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        랭킹에 점수 등록 중...
                      </span>
                    )}
                    {submissionState === "success" && (
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        기록이 랭킹에 등록되었습니다!
                      </span>
                    )}
                    {submissionState === "error" && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400">
                          <AlertCircle className="w-4 h-4" />
                          {submissionError || "기록 저장 실패"}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleScoreSubmission(result.score)}
                          className="px-3 py-1 bg-surface border border-border hover:bg-surface-overlay text-text-primary text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          점수 다시 제출
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleRetryGame}
                    className="px-8 py-3 bg-brand text-white rounded-xl font-extrabold hover:bg-brand-light shadow-lg shadow-brand/25 transition-all cursor-pointer"
                  >
                    🔄 다시 하기
                  </button>
                  <button
                    type="button"
                    onClick={() => void navigate("/games")}
                    className="px-8 py-3 bg-surface text-text-primary border border-border rounded-xl font-extrabold hover:bg-surface-raised transition-colors cursor-pointer"
                  >
                    목록으로
                  </button>
                </div>
              </div>
            ) : null}

            <div className="p-6">
              <GameComponent key={attemptKey} runtime={runtime} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
