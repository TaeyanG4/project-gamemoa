import { useEffect, useState, useMemo, type ComponentType } from "react";
import { useParams, useNavigate } from "react-router";
import { loadGame, gameManifests } from "../features/catalog/registry";
import type { GameRuntimeContext, GameResult, GameProps } from "@gamemoa/game-sdk";
import { saveLocalBestScore, submitScoreApi } from "@gamemoa/core";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function GamePlay() {
  const params = useParams();
  const navigate = useNavigate();
  const slug = params.slug ?? "";

  const [GameComponent, setGameComponent] = useState<ComponentType<GameProps> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<GameResult | null>(null);

  const manifest = useMemo(() => gameManifests.find(m => m.slug === slug), [slug]);

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

  const runtime = useMemo<GameRuntimeContext>(() => ({
    sessionId: crypto.randomUUID(),
    user: null,
    emit: (event) => {
      console.log("Game event emitted:", event);
    },
    complete: async (gameResult) => {
      console.log("Game completed with result:", gameResult);
      setResult(gameResult);

      const lowerIsBetter = slug === "reaction-time" || slug === "aim-test";
      saveLocalBestScore(slug, gameResult.score, lowerIsBetter);
      void submitScoreApi({ gameId: slug, score: gameResult.score });
    },
    cancel: () => {
      void navigate("/games");
    }
  }), [navigate, slug]);


  if (error) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center flex-1">
        <AlertCircle className="w-16 h-16 text-accent-red mb-6" />
        <h2 className="text-2xl font-bold mb-4">{error}</h2>
        <button
          type="button"
          onClick={() => void navigate("/games")}
          className="px-6 py-3 bg-surface-raised border border-border rounded-lg hover:bg-surface-overlay transition-colors"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-[#09090b]">
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
        ) : GameComponent ? (
          <div className="w-full max-w-4xl bg-surface-raised rounded-xl shadow-2xl overflow-hidden relative border border-border/50">
            {result ? (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-8 text-center">
                <h3 className="text-3xl font-extrabold mb-2 text-white">게임 종료!</h3>
                <div className="mb-8 p-6 bg-surface-raised rounded-2xl border border-border">
                  <p className="text-text-secondary text-sm mb-1">점수</p>
                  <p className="text-5xl font-black text-brand mb-4">{result.score}</p>

                  {result.metadata && Object.keys(result.metadata).length > 0 && (
                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
                      {Object.entries(result.metadata).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-xs text-text-muted capitalize">{key}</p>
                          <p className="font-semibold text-text-primary">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="px-8 py-3 bg-brand text-white rounded-lg font-bold hover:bg-brand-light transition-colors"
                  >
                    다시 하기
                  </button>
                  <button
                    type="button"
                    onClick={() => void navigate("/games")}
                    className="px-8 py-3 bg-surface text-text-primary border border-border rounded-lg font-bold hover:bg-surface-raised transition-colors"
                  >
                    목록으로
                  </button>
                </div>
              </div>
            ) : null}

            <div className="p-6">
              <GameComponent runtime={runtime} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
