import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router";
import type { PublicCreatorGame, LeaderRecord } from "@owogg/contracts";
import { formatScore } from "@owogg/game-sdk";
import { useAuth } from "../auth";
import { useI18n } from "../i18n/I18nContext";
import { IframeRuntime } from "./runtime/IframeRuntime";
import { sandboxGamePlayUrl } from "../../lib/api/config";
import { fetchGameSession } from "./gameSessionApi";
import { acceptCreatorScore } from "./creatorScoreAcceptApi";
import { createCreatorScoreFlow, type CreatorScoreSubmissionState } from "./creatorScoreFlow";
import { fetchCreatorLeaderboardPreview } from "./creatorLeaderboardPreview";
import { ArrowLeft, AlertCircle, CheckCircle2, RefreshCw, Trophy } from "lucide-react";

export interface CreatorGameHostProps {
  slug: string;
  game: PublicCreatorGame;
}

interface CreatorGameCompleteResult {
  score?: number;
  metadata?: Record<string, unknown>;
}

/**
 * TRANSITIONAL. The Creator-owned counterpart to GameHost, reached only through
 * transitionalCreatorGameResolver's runtime-kind check — see that file's doc comment for why this
 * is a separate component rather than a branch inside GameHost itself. Plays the game through
 * IframeRuntime + the Game Bridge (packages/game-sdk/src/bridge/) instead of LegacyReactRuntime.
 *
 * GAME_COMPLETE now feeds Creator score acceptance (creatorScoreFlow.ts) when a score is present
 * and the player is logged in — see that module's own doc comment for the full lifecycle
 * contract. A successful save also fetches a compact leaderboard preview (top 5, via the same
 * generalized GET /api/scores/:slug the SYSTEM leaderboard already uses — see
 * creatorLeaderboardPreview.ts). Still stops short of any XP/achievement/guild XP connection.
 */
export function CreatorGameHost({ slug, game }: CreatorGameHostProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, openLoginModal } = useAuth();
  const { dict } = useI18n();

  const [attemptKey, setAttemptKey] = useState(0);
  const [result, setResult] = useState<CreatorGameCompleteResult | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [submissionState, setSubmissionState] = useState<CreatorScoreSubmissionState>("idle");
  const [submissionMessage, setSubmissionMessage] = useState<string | undefined>(undefined);
  const [leaderboardPreview, setLeaderboardPreview] = useState<LeaderRecord[] | null>(null);

  // One controller per slug — see creatorScoreFlow.ts's own doc comment for why this is a plain
  // factory function rather than a hook (apps/web has no component-render test harness, so the
  // orchestration logic lives here, framework-free and independently unit-tested).
  const scoreFlow = useMemo(
    () =>
      createCreatorScoreFlow(
        { slug, fetchGameSession, acceptScore: acceptCreatorScore },
        {
          onStatusChange: (state, message) => {
            setSubmissionState(state);
            setSubmissionMessage(message);
          },
        },
      ),
    [slug],
  );

  // One fetchGameSession() per attempt — component mount, then every retry (attemptKey bump).
  // Waits out authLoading first: without this, a player who is actually logged in but whose
  // session check hasn't resolved yet at mount would start attempt 1 read as anonymous, and
  // (since isAuthenticated is deliberately NOT a dependency below) stay that way for the whole
  // attempt — the same stale-auth-snapshot bug GameHost's own runtime.complete() comment
  // documents, just hit earlier here because this effect runs at attempt START, not completion.
  // authLoading flipping to false re-fires this effect once, for the CURRENT attemptKey, exactly
  // when the real answer becomes available.
  //
  // isAuthenticated itself stays out of the dependency list on purpose: once resolved, a login
  // state change mid-round must not silently swap out a token already held for the attempt in
  // progress. The effect still reads the CURRENT isAuthenticated value whenever it does run
  // (every render closes over the latest value), so the next retry picks up any change correctly.
  useEffect(() => {
    if (authLoading) return;
    void scoreFlow.startAttempt(isAuthenticated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreFlow, attemptKey, authLoading]);

  // Leaderboard preview — fetched only after the score actually saved (not at round-end
  // regardless of outcome, unlike GameHost's own preview): a guest or a failed/rejected
  // submission has nothing new to show. Re-fires on every fresh "success" (including a
  // subsequent retry's own successful save, since submissionState passes back through
  // "idle"/"submitting" in between, which React sees as a real dependency change).
  useEffect(() => {
    if (submissionState !== "success") return;
    let isMounted = true;
    void fetchCreatorLeaderboardPreview(slug).then((records) => {
      if (isMounted) setLeaderboardPreview(records);
    });
    return () => {
      isMounted = false;
    };
  }, [submissionState, slug]);

  const handleComplete = useCallback(
    (completeResult: CreatorGameCompleteResult) => {
      // The local result is set unconditionally and first — a failed or skipped score
      // submission below must never take the player's own result screen down with it.
      setResult(completeResult);
      void scoreFlow.handleComplete(isAuthenticated, completeResult);
    },
    [scoreFlow, isAuthenticated],
  );

  const handleCancel = useCallback(() => {
    void navigate("/games");
  }, [navigate]);

  const handleError = useCallback(
    (message?: string) => {
      setBridgeError(message || dict.gamePlay.errorLoadFailed);
    },
    [dict],
  );

  const handleRetry = useCallback(() => {
    setResult(null);
    setBridgeError(null);
    setLeaderboardPreview(null);
    setAttemptKey((prev) => prev + 1);
  }, []);

  return (
    <div className="flex flex-col flex-1 bg-[#09090b] select-none">
      {/* Game Header — deliberately simpler than GameHost's: no difficulty selector, no
          leaderboard link. Creator games don't have either wired up yet. */}
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
          <span className="font-bold">{game.title}</span>
        </div>
      </div>

      {/* Game Area Container */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4">
        {bridgeError ? (
          <div className="w-full max-w-md bg-surface-raised rounded-3xl border border-border p-8 text-center shadow-2xl flex flex-col items-center gap-4">
            <AlertCircle className="w-14 h-14 text-accent-red" />
            <p className="text-sm text-text-secondary">{bridgeError}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="px-6 py-3 bg-brand text-white font-extrabold rounded-2xl shadow-lg shadow-brand/30 hover:scale-105 transition-all cursor-pointer"
            >
              {dict.gamePlay.retryGameCta}
            </button>
          </div>
        ) : (
          <div className="w-full max-w-6xl bg-surface-raised rounded-xl shadow-2xl overflow-hidden relative border border-border/50">
            {/* Result overlay — same layout/classes as GameHost's. Score save status and a
                leaderboard preview are shown below (mirroring GameHost's own submissionState/
                resultLeaderboard blocks); share stays out — Creator games don't have that yet. */}
            {result ? (
              <div className="absolute inset-0 z-50 overflow-y-auto bg-black/90">
                <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center md:p-8">
                  <h3 className="text-3xl font-extrabold text-white">
                    {dict.gamePlay.resultTitle}
                  </h3>

                  <div className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-6">
                    <div className="mb-3 flex items-center justify-center gap-2">
                      <span className="text-sm font-bold text-text-secondary">{game.title}</span>
                    </div>

                    {result.score !== undefined && (
                      <p className="text-5xl font-black text-brand mb-1">
                        {formatScore(result.score, undefined)}
                      </p>
                    )}

                    {result.metadata && Object.keys(result.metadata).length > 0 && (
                      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/80">
                        {Object.entries(result.metadata).map(([key, value]) => (
                          <div
                            key={key}
                            className="bg-surface/50 p-2.5 rounded-xl border border-border/40"
                          >
                            <p className="text-xs text-text-muted font-bold mb-0.5">{key}</p>
                            <p className="font-extrabold text-text-primary text-sm">
                              {String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="mt-6 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      owogg.com
                    </p>
                  </div>

                  {/* Score save status — only meaningful when this round actually produced a
                      score (see creatorScoreFlow.ts: no score means no submission attempt, so
                      submissionState stays whatever the last attempt left it at, which the
                      result.score check below correctly ignores). No leaderboard preview, no
                      share row — Creator games don't have either yet. */}
                  {result.score !== undefined && (
                    <div className="w-full max-w-md flex flex-col gap-3">
                      {submissionState === "guest" && (
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-xs font-bold text-text-secondary">
                            {dict.gamePlay.creatorScoreGuestNoticeTitle}
                          </span>
                          <span className="text-[11px] text-text-muted">
                            {dict.gamePlay.creatorScoreGuestNoticeBody}
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
                        <span className="inline-flex items-center justify-center gap-2 text-xs font-bold text-brand animate-pulse">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          {dict.gamePlay.creatorScoreSubmittingLabel}
                        </span>
                      )}
                      {submissionState === "success" && (
                        <span className="inline-flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          {dict.gamePlay.creatorScoreSuccessLabel}
                        </span>
                      )}
                      {submissionState === "error" && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400">
                          <AlertCircle className="w-4 h-4" />
                          {submissionMessage || dict.gamePlay.creatorScoreErrorFallback}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Leaderboard preview — only once a save has actually succeeded (see the
                      fetch effect above). Same visual style as GameHost's own preview block; no
                      "view full ranking" link, since /games/:slug/ranking is still SYSTEM-only. */}
                  {submissionState === "success" && leaderboardPreview && (
                    <div className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-4 text-left">
                      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-text-muted">
                        <Trophy className="h-3.5 w-3.5 text-accent-yellow" />
                        {dict.gamePlay.leaderboardTitle}
                      </p>
                      {leaderboardPreview.length === 0 ? (
                        <p className="py-3 text-center text-xs text-text-muted">
                          {dict.gamePlay.leaderboardEmpty}
                        </p>
                      ) : (
                        <ol className="space-y-1">
                          {leaderboardPreview.map((record, i) => {
                            const isMe = user !== null && record.userId === user.id;
                            return (
                              <li
                                key={record.id}
                                className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-xs ${
                                  isMe ? "bg-brand/10 ring-1 ring-brand/40" : "bg-surface"
                                }`}
                              >
                                {record.userId !== null && record.userId !== undefined ? (
                                  <Link
                                    to={`/users/${record.userId}`}
                                    className={`flex items-center gap-2 truncate font-semibold hover:underline ${
                                      isMe ? "text-brand" : "text-brand-light"
                                    }`}
                                  >
                                    <span className="w-4 shrink-0 text-text-muted">#{i + 1}</span>
                                    <span className="truncate">{record.playerName}</span>
                                    {isMe && (
                                      <span className="shrink-0 text-[10px] font-black text-brand">
                                        ({dict.gamePlay.leaderboardYou})
                                      </span>
                                    )}
                                  </Link>
                                ) : (
                                  <span className="flex items-center gap-2 truncate font-semibold text-text-secondary">
                                    <span className="w-4 shrink-0 text-text-muted">#{i + 1}</span>
                                    <span className="truncate">{record.playerName}</span>
                                  </span>
                                )}
                                <span
                                  className={`shrink-0 font-black ${isMe ? "text-brand" : "text-brand-light"}`}
                                >
                                  {record.formattedScore}
                                </span>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={handleRetry}
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
              </div>
            ) : null}

            <div className="p-6">
              <IframeRuntime
                src={sandboxGamePlayUrl(slug)}
                title={game.title}
                attemptKey={attemptKey}
                onComplete={handleComplete}
                onCancel={handleCancel}
                onError={handleError}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
