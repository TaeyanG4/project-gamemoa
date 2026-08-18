import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import type { PublicCreatorGame } from "@owogg/contracts";
import { formatScore } from "@owogg/game-sdk";
import { useI18n } from "../i18n/I18nContext";
import { IframeRuntime } from "./runtime/IframeRuntime";
import { sandboxGamePlayUrl } from "../../lib/api/config";
import { ArrowLeft, AlertCircle } from "lucide-react";

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
 * IframeRuntime + the Game Bridge (packages/game-sdk/src/bridge/) instead of LegacyReactRuntime,
 * and stops exactly where this integration was scoped to stop: GAME_COMPLETE reaches a result
 * screen modeled on GameHost's own (same layout/classes, for visual consistency), and nothing
 * past it. No score submission, no leaderboard preview, no XP — Creator score/XP/leaderboard
 * support does not exist yet, so there is nothing yet for a completed round to actually feed.
 */
export function CreatorGameHost({ slug, game }: CreatorGameHostProps) {
  const navigate = useNavigate();
  const { dict } = useI18n();

  const [attemptKey, setAttemptKey] = useState(0);
  const [result, setResult] = useState<CreatorGameCompleteResult | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  const handleComplete = useCallback((completeResult: CreatorGameCompleteResult) => {
    setResult(completeResult);
  }, []);

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
            {/* Result overlay — same layout/classes as GameHost's, minus everything downstream of
                "a round finished" that Creator games don't have yet (score submission status,
                leaderboard preview, share). */}
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
