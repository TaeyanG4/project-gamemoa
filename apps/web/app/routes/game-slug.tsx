import { useEffect, useState, useMemo, useCallback, type ComponentType } from "react";
import { useParams, useNavigate } from "react-router";
import { loadGame, gameManifests } from "../features/catalog/registry";
import {
  formatScore,
  type GameRuntimeContext,
  type GameResult,
  type GameProps,
} from "@owogg/game-sdk";
import {
  saveLocalBestScore,
  submitScoreApi,
  extractPlayTokenFromLocation,
} from "../features/scores/api";
import { useAuth } from "../features/auth";
import { usePersonalization } from "../features/personalization";
import { useI18n } from "../features/i18n/I18nContext";
import { getLocalizedGameContent } from "../features/catalog/localizedGameContent";
import type { Dictionary } from "../features/i18n/dictionary";
import { ArrowLeft, AlertCircle, RefreshCw, CheckCircle2, UserCheck, Share2 } from "lucide-react";

type SubmissionState = "idle" | "guest" | "submitting" | "success" | "error";

function formatMetadataKey(key: string, dict: Dictionary["gamePlay"]): string {
  const map: Record<string, string> = {
    wpm: dict.metadataWpm,
    cpm: dict.metadataCpm,
    accuracy: dict.metadataAccuracy,
    correctChars: dict.metadataCorrectChars,
    incorrectChars: dict.metadataIncorrectChars,
    totalTypedChars: dict.metadataTotalTypedChars,
    durationMs: dict.metadataDurationMs,
    targetsHit: dict.metadataTargetsHit,
    misses: dict.metadataMisses,
    level: dict.metadataLevel,
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
  const { dict } = useI18n();

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
  const localizedTitle = manifest ? getLocalizedGameContent(dict, manifest).title : undefined;

  // Load Game Module
  useEffect(() => {
    let isMounted = true;
    extractPlayTokenFromLocation();

    async function init() {
      try {
        setIsLoading(true);
        setError(null);
        const module = await loadGame(slug);

        if (!isMounted) return;

        if (!module) {
          setError(dict.gamePlay.errorGameNotFound);
        } else {
          setGameComponent(() => module.Game);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load game:", err);
          setError(dict.gamePlay.errorLoadFailed);
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
    // loadGame() dynamic-imports the module, which the bundler caches per specifier — re-running
    // this on a locale switch is just a cache hit, not a real re-fetch, so it's safe to depend on
    // these two dict strings the same way exhaustive-deps wants.
  }, [slug, dict.gamePlay.errorGameNotFound, dict.gamePlay.errorLoadFailed]);

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
          setSubmissionError(dict.gamePlay.errorSubmitFailed);
        }
      } catch {
        setSubmissionState("error");
        setSubmissionError(dict.gamePlay.errorNetworkSubmitFailed);
      }
    },
    [slug, dict.gamePlay.errorSubmitFailed, dict.gamePlay.errorNetworkSubmitFailed],
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

  // Share Result (Web Share API where available, clipboard copy as fallback)
  const [shareCopied, setShareCopied] = useState(false);
  const handleShareResult = useCallback(async () => {
    if (!result || !manifest) return;
    const shareUrl = `${window.location.origin}/games/${slug}`;
    const scoreText = formatScore(result.score, manifest.scoreConfig);
    const title = getLocalizedGameContent(dict, manifest).title;
    const shareText = dict.gamePlay.shareText
      .replace("{title}", title)
      .replace("{score}", scoreText);

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: shareText, url: shareUrl });
      } catch {
        // User cancelled the native share sheet — not an error, nothing to do.
      }
      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }, [result, manifest, slug, dict]);

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
          {dict.gamePlay.backToList}
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
            <span className="text-sm font-medium hidden sm:inline">{dict.gamePlay.back}</span>
          </button>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-md"
              style={{ backgroundColor: manifest?.accent ?? "#6366f1" }}
            />
            <span className="font-bold">{localizedTitle ?? dict.gamePlay.loadingTitle}</span>
          </div>
        </div>
      </div>

      {/* Game Area Container */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
            <p className="text-text-secondary font-medium animate-pulse">
              {dict.gamePlay.loadingBody}
            </p>
          </div>
        ) : isAuthBlocked ? (
          <div className="w-full max-w-md bg-surface-raised rounded-3xl border border-border p-8 text-center shadow-2xl flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand/10 text-brand flex items-center justify-center">
              <UserCheck className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black text-text-primary">
              {dict.gamePlay.authRequiredTitle}
            </h3>
            <p className="text-sm text-text-secondary">{dict.gamePlay.authRequiredBody}</p>
            <button
              onClick={openLoginModal}
              className="w-full py-3 bg-brand text-white font-extrabold rounded-2xl shadow-lg shadow-brand/30 hover:scale-105 transition-all cursor-pointer mt-2"
            >
              {dict.gamePlay.authRequiredCta}
            </button>
          </div>
        ) : GameComponent ? (
          <div className="w-full max-w-6xl bg-surface-raised rounded-xl shadow-2xl overflow-hidden relative border border-border/50">
            {/* Game Result & Score Submission Overlay */}
            {result ? (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-8 text-center">
                <h3 className="text-3xl font-extrabold mb-2 text-white">
                  {dict.gamePlay.resultTitle}
                </h3>
                <div className="mb-6 p-6 bg-surface-raised rounded-2xl border border-border w-full max-w-md">
                  <p className="text-text-secondary text-sm mb-1">
                    {rankingEligible
                      ? dict.gamePlay.finalScoreLabel
                      : dict.gamePlay.deviceBestLabel}
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
                            {formatMetadataKey(key, dict.gamePlay)}
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
                          {dict.gamePlay.guestNoticeTitle}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {dict.gamePlay.guestNoticeBody}
                        </span>
                        <button
                          type="button"
                          onClick={openLoginModal}
                          className="mt-1 px-4 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
                        >
                          {dict.gamePlay.guestLoginCta}
                        </button>
                      </div>
                    )}
                    {submissionState === "submitting" && (
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-brand animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        {dict.gamePlay.submittingLabel}
                      </span>
                    )}
                    {submissionState === "success" && (
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        {dict.gamePlay.successLabel}
                      </span>
                    )}
                    {submissionState === "error" && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400">
                          <AlertCircle className="w-4 h-4" />
                          {submissionError || dict.gamePlay.errorSubmitFallback}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleScoreSubmission(result.score)}
                          className="px-3 py-1 bg-surface border border-border hover:bg-surface-overlay text-text-primary text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          {dict.gamePlay.retrySubmitCta}
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleShareResult()}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    {shareCopied ? dict.gamePlay.shareCopiedFeedback : dict.gamePlay.shareCta}
                  </button>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleRetryGame}
                    className="px-8 py-3 bg-brand text-white rounded-xl font-extrabold hover:bg-brand-light shadow-lg shadow-brand/25 transition-all cursor-pointer"
                  >
                    {dict.gamePlay.retryGameCta}
                  </button>
                  <button
                    type="button"
                    onClick={() => void navigate("/games")}
                    className="px-8 py-3 bg-surface text-text-primary border border-border rounded-xl font-extrabold hover:bg-surface-raised transition-colors cursor-pointer"
                  >
                    {dict.gamePlay.backToListResult}
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
