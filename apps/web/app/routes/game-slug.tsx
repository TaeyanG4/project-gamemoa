import { useEffect, useState, useMemo, useCallback, useRef, type ComponentType } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { loadGame, gameManifests } from "../features/catalog/registry";
import { useIsGameDisabled } from "../features/catalog/gameAvailability";
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
  fetchLeaderboardApi,
} from "../features/scores/api";
import { useAuth } from "../features/auth";
import { usePersonalization } from "../features/personalization";
import { useI18n } from "../features/i18n/I18nContext";
import { getLocalizedGameContent } from "../features/catalog/localizedGameContent";
import { localizedDifficultyLabel } from "../features/catalog/difficultyLabels";
import { GameThumbnail } from "../components/ui/GameThumbnail";
import { XIcon } from "../components/ui/XIcon";
import { DiscordIcon } from "../components/ui/DiscordIcon";
import type { Dictionary } from "../features/i18n/dictionary";
import type { LeaderRecord } from "@owogg/contracts";
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  UserCheck,
  Camera,
  Trophy,
} from "lucide-react";

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

  // Result-screen leaderboard preview — only fetched for games that opt in
  // (manifest.supportsLeaderboard), so casual games where rank doesn't matter can skip it.
  const [resultLeaderboard, setResultLeaderboard] = useState<LeaderRecord[] | null>(null);

  const manifest = useMemo(() => gameManifests.find((m) => m.slug === slug), [slug]);
  const localizedTitle = manifest ? getLocalizedGameContent(dict, manifest).title : undefined;
  const isDisabled = useIsGameDisabled(manifest?.id ?? slug);

  // Difficulty selection — only meaningful for games with manifest.difficulty. Resets to the
  // game's default whenever navigating between games. A change here only affects the NEXT
  // attempt (handleStart, inside the game component) — an already-in-progress round keeps
  // whatever it captured when it started, never flips difficulty mid-round.
  const [selectedDifficultyId, setSelectedDifficultyId] = useState<string>("normal");
  useEffect(() => {
    setSelectedDifficultyId(manifest?.difficulty?.defaultLevelId ?? "normal");
  }, [manifest]);

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
        const payload: {
          gameId: string;
          score: number;
          nickname?: string;
          difficulty?: string;
        } = {
          gameId: slug,
          score: scoreToSubmit,
          difficulty: selectedDifficultyId,
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
    [
      slug,
      selectedDifficultyId,
      dict.gamePlay.errorSubmitFailed,
      dict.gamePlay.errorNetworkSubmitFailed,
    ],
  );

  // Reset / Retry Game Attempt
  const handleRetryGame = useCallback(() => {
    setResult(null);
    setSubmissionState("idle");
    setSubmissionError(null);
    setResultLeaderboard(null);
    setRankingEligible(isAuthenticated);
    setSessionId(crypto.randomUUID());
    setAttemptKey((prev) => prev + 1);
  }, [isAuthenticated]);

  // Fetch a compact leaderboard preview as soon as the game ends (not gated on score
  // submission succeeding — guests and rejected submissions still get competitive context).
  // Skipped entirely for games with supportsLeaderboard: false.
  useEffect(() => {
    if (!result || !manifest?.supportsLeaderboard) return;
    let isMounted = true;
    fetchLeaderboardApi(slug, selectedDifficultyId)
      .then((records) => {
        if (isMounted) setResultLeaderboard(records.slice(0, 5));
      })
      .catch(() => {
        if (isMounted) setResultLeaderboard([]);
      });
    return () => {
      isMounted = false;
    };
  }, [result, manifest, slug, selectedDifficultyId]);

  // Share Result — scoped to X (official web intent), Discord (no web intent exists, so this
  // copies formatted text to paste manually), and a screenshot-copy of the result card. Web
  // Share API / Instagram / TikTok deliberately dropped from this pass (operator decision).
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [discordCopied, setDiscordCopied] = useState(false);
  const [screenshotState, setScreenshotState] = useState<
    "idle" | "copying" | "copied" | "downloaded" | "error"
  >("idle");

  const buildShareText = useCallback(() => {
    if (!result || !manifest) return null;
    const scoreText = formatScore(result.score, manifest.scoreConfig);
    const title = getLocalizedGameContent(dict, manifest).title;
    return dict.gamePlay.shareText.replace("{title}", title).replace("{score}", scoreText);
  }, [result, manifest, dict]);

  const handleShareX = useCallback(() => {
    const shareText = buildShareText();
    if (!shareText) return;
    const shareUrl = `${window.location.origin}/games/${slug}`;
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(intentUrl, "_blank", "noopener,noreferrer");
  }, [buildShareText, slug]);

  const handleShareDiscord = useCallback(async () => {
    const shareText = buildShareText();
    if (!shareText || !navigator.clipboard) return;
    const shareUrl = `${window.location.origin}/games/${slug}`;
    await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
    setDiscordCopied(true);
    setTimeout(() => setDiscordCopied(false), 2000);
  }, [buildShareText, slug]);

  const handleCopyScreenshot = useCallback(async () => {
    if (!shareCardRef.current) return;
    setScreenshotState("copying");
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(shareCardRef.current, { pixelRatio: 2 });
      if (!blob) throw new Error("html-to-image returned no blob");

      if (navigator.clipboard && typeof window.ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setScreenshotState("copied");
      } else {
        // Clipboard image writes aren't universally supported (older browsers, some mobile
        // in-app browsers) — fall back to a plain download instead of failing silently.
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `owogg-${slug}-result.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setScreenshotState("downloaded");
      }
    } catch (err) {
      console.error("Screenshot copy failed:", err);
      setScreenshotState("error");
    } finally {
      setTimeout(() => setScreenshotState("idle"), 2500);
    }
  }, [slug]);

  const { recordRecentPlay } = usePersonalization();

  // Game Runtime Context
  const runtime = useMemo<GameRuntimeContext>(
    () => ({
      sessionId,
      user: user ? { id: String(user.id), displayName: user.nickname } : null,
      difficultyId: selectedDifficultyId,
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
      selectedDifficultyId,
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

  // Admin kill switch (see adminGames.ts) — blocks play even if the client already finished
  // loading the game bundle before an admin disabled it mid-session.
  if (isDisabled) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center flex-1 select-none text-center">
        <AlertCircle className="w-16 h-16 text-accent-yellow mb-6" />
        <h2 className="text-2xl font-bold mb-2">{dict.gamePlay.gameDisabledTitle}</h2>
        <p className="mb-6 max-w-sm text-sm text-text-muted">{dict.gamePlay.gameDisabledBody}</p>
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
            <GameThumbnail
              thumbnail={manifest?.thumbnail ?? ""}
              title={localizedTitle ?? ""}
              accent={manifest?.accent}
              className="h-6 w-6"
              rounded="rounded-md"
            />
            <span className="font-bold">{localizedTitle ?? dict.gamePlay.loadingTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {manifest?.difficulty && (
            <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-surface-raised p-1">
              {manifest.difficulty.levels.map((level) => {
                const isSelected = level.id === selectedDifficultyId;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setSelectedDifficultyId(level.id)}
                    aria-pressed={isSelected}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-brand text-white shadow-sm"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-overlay"
                    }`}
                  >
                    {localizedDifficultyLabel(level.id, level.label, dict.gamePlay)}
                  </button>
                );
              })}
            </div>
          )}

          {manifest?.supportsLeaderboard && (
            <Link
              to={`/games/${slug}/ranking`}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <Trophy className="h-4 w-4 text-accent-yellow" />
              <span className="hidden sm:inline">{dict.gameRanking.eyebrow}</span>
            </Link>
          )}
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
                  {/* Everything inside this ref is what handleCopyScreenshot captures — kept
                      self-contained (branding + game + score) since a screenshot has to make
                      sense on its own outside the app, unlike the interactive elements below it. */}
                  <div ref={shareCardRef} className="bg-surface-raised">
                    <div className="mb-3 flex items-center justify-center gap-2">
                      <GameThumbnail
                        thumbnail={manifest?.thumbnail ?? ""}
                        title={localizedTitle ?? ""}
                        accent={manifest?.accent}
                        className="h-6 w-6"
                        rounded="rounded-md"
                      />
                      <span className="text-sm font-bold text-text-secondary">
                        {localizedTitle}
                      </span>
                    </div>
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

                    <p className="mt-6 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      owogg.com
                    </p>
                  </div>

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

                  {/* Leaderboard preview — skipped for games with supportsLeaderboard: false */}
                  {manifest?.supportsLeaderboard && resultLeaderboard && (
                    <div className="mt-4 border-t border-border/60 pt-4 text-left">
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-text-muted">
                        <Trophy className="h-3.5 w-3.5 text-accent-yellow" />
                        {dict.gamePlay.leaderboardTitle}
                      </p>
                      {resultLeaderboard.length === 0 ? (
                        <p className="py-3 text-center text-xs text-text-muted">
                          {dict.gamePlay.leaderboardEmpty}
                        </p>
                      ) : (
                        <ol className="space-y-1">
                          {resultLeaderboard.map((record, i) => (
                            <li
                              key={record.id}
                              className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-1.5 text-xs"
                            >
                              {record.userId !== null && record.userId !== undefined ? (
                                <Link
                                  to={`/users/${record.userId}`}
                                  className="flex items-center gap-2 truncate font-semibold text-brand-light hover:underline"
                                >
                                  <span className="w-4 shrink-0 text-text-muted">#{i + 1}</span>
                                  <span className="truncate">{record.playerName}</span>
                                </Link>
                              ) : (
                                <span className="flex items-center gap-2 truncate font-semibold text-text-secondary">
                                  <span className="w-4 shrink-0 text-text-muted">#{i + 1}</span>
                                  <span className="truncate">{record.playerName}</span>
                                </span>
                              )}
                              <span className="shrink-0 font-black text-brand-light">
                                {record.formattedScore}
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                      <Link
                        to={`/games/${slug}/ranking`}
                        className="mt-2 inline-block text-[11px] font-bold text-brand-light hover:underline"
                      >
                        {dict.gamePlay.viewFullRanking}
                      </Link>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={handleShareX}
                      className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-2 py-2.5 text-[10px] font-bold text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary cursor-pointer"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                      <span className="truncate">{dict.gamePlay.shareXCta}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleShareDiscord()}
                      className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-2 py-2.5 text-[10px] font-bold text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary cursor-pointer"
                    >
                      <DiscordIcon className="h-3.5 w-3.5" />
                      <span className="truncate">
                        {discordCopied
                          ? dict.gamePlay.shareDiscordCopiedFeedback
                          : dict.gamePlay.shareDiscordCta}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopyScreenshot()}
                      disabled={screenshotState === "copying"}
                      className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface px-2 py-2.5 text-[10px] font-bold text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary cursor-pointer disabled:opacity-50"
                    >
                      {screenshotState === "copying" ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Camera className="h-3.5 w-3.5" />
                      )}
                      <span className="truncate">
                        {screenshotState === "copied"
                          ? dict.gamePlay.screenshotCopiedFeedback
                          : screenshotState === "downloaded"
                            ? dict.gamePlay.screenshotDownloadedFeedback
                            : screenshotState === "error"
                              ? dict.gamePlay.screenshotErrorFeedback
                              : dict.gamePlay.screenshotCopyCta}
                      </span>
                    </button>
                  </div>
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
