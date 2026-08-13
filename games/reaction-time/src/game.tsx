import { useState, useCallback, useEffect, useRef } from "react";
import type { GameProps } from "@owogg/game-sdk";
import {
  type RoundState,
  INITIAL_ROUND_STATE,
  startRound,
  showGreen,
  handleClick,
  generateDelay,
  calculateAverageReactionTime,
  NUM_ROUNDS,
} from "./rules.js";

export function Game({ runtime }: GameProps) {
  const [round, setRound] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(INITIAL_ROUND_STATE);
  const [results, setResults] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameStartedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startNewRound = useCallback(() => {
    if (!gameStartedRef.current) {
      gameStartedRef.current = true;
      runtime.emit({ type: "game_started", at: Date.now() });
    }
    cleanup();
    const now = Date.now();
    setRoundState(startRound(now));

    const delay = generateDelay();
    timerRef.current = setTimeout(() => {
      setRoundState((prev) => showGreen(prev, Date.now()));
    }, delay);
  }, [cleanup, runtime]);

  const handleScreenClick = useCallback(() => {
    if (roundState.phase === "waiting") {
      startNewRound();
      return;
    }

    if (roundState.phase === "ready" || roundState.phase === "go") {
      cleanup();
      const now = Date.now();
      const newState = handleClick(roundState, now);
      setRoundState(newState);

      if (newState.phase === "result" && newState.reactionTimeMs !== null) {
        const newResults = [...results, newState.reactionTimeMs];
        setResults(newResults);

        if (newResults.length >= NUM_ROUNDS) {
          const avgMs = calculateAverageReactionTime(newResults);
          void runtime.complete({
            gameId: "reaction-time",
            sessionId: runtime.sessionId,
            score: avgMs,
            durationMs: Date.now() - (roundState.startedAt ?? Date.now()),
            metadata: { rounds: newResults },
            clientStartedAt: roundState.startedAt ?? Date.now(),
            clientEndedAt: Date.now(),
          });
          runtime.emit({ type: "game_completed", at: Date.now() });
        }
      }
    }
  }, [roundState, cleanup, startNewRound, results, runtime]);

  const handleRetry = useCallback(() => {
    setRound(0);
    setResults([]);
    setRoundState(INITIAL_ROUND_STATE);
    gameStartedRef.current = false;
  }, []);

  const handleNextRound = useCallback(() => {
    setRound((r) => r + 1);
    startNewRound();
  }, [startNewRound]);

  // Determine display based on phase with explicit hex background colors
  const getPhaseDisplay = () => {
    switch (roundState.phase) {
      case "waiting":
        return { bgColor: "#262626", text: "클릭하여 시작", subtext: `${NUM_ROUNDS}라운드 진행` };
      case "ready":
        return { bgColor: "#dc2626", text: "기다리세요...", subtext: "초록색이 되면 클릭!" };
      case "go":
        return { bgColor: "#16a34a", text: "지금 클릭!", subtext: "" };
      case "too-early":
        return { bgColor: "#d97706", text: "너무 빨랐어요!", subtext: "클릭하여 다시 시도" };
      case "result":
        return {
          bgColor: "#2563eb",
          text: `${roundState.reactionTimeMs}ms`,
          subtext:
            results.length >= NUM_ROUNDS
              ? `평균: ${calculateAverageReactionTime(results)}ms`
              : `라운드 ${results.length}/${NUM_ROUNDS}`,
        };
    }
  };

  const display = getPhaseDisplay();
  const isGameComplete = results.length >= NUM_ROUNDS;

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full select-none">
      <div className="text-sm text-neutral-400 mb-4 font-bold">
        라운드 {Math.min(round + 1, NUM_ROUNDS)} / {NUM_ROUNDS}
      </div>

      <button
        type="button"
        onClick={
          roundState.phase === "too-early"
            ? startNewRound
            : roundState.phase === "result" && !isGameComplete
              ? handleNextRound
              : handleScreenClick
        }
        style={{ backgroundColor: display.bgColor }}
        className="w-full max-w-4xl min-h-[380px] md:min-h-[460px] rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-colors duration-150 shadow-2xl border border-white/20 active:scale-[0.99]"
        aria-label={display.text}
      >
        <span className="text-4xl font-black text-white drop-shadow-md">{display.text}</span>
        {display.subtext && (
          <span className="text-base font-bold text-white/90 mt-3 drop-shadow-sm">
            {display.subtext}
          </span>
        )}
      </button>

      {results.length > 0 && (
        <div className="mt-6 flex gap-2 flex-wrap justify-center">
          {results.map((ms, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-surface-raised border border-border rounded-full text-xs font-bold text-text-primary"
            >
              R{i + 1}: {ms}ms
            </span>
          ))}
        </div>
      )}

      {isGameComplete && (
        <button
          type="button"
          onClick={handleRetry}
          className="mt-6 px-8 py-3 bg-brand hover:bg-brand-dark rounded-2xl text-white font-extrabold shadow-lg transition-all cursor-pointer"
        >
          다시 도전하기
        </button>
      )}
    </div>
  );
}
