import { useState, useEffect, useRef, useCallback } from "react";
import type { GameProps } from "@gamemoa/game-sdk";
import { getRandomPassage, calculateTypingResult, type TypingResult } from "./logic.js";
import { manifest } from "./manifest.js";

type GameStatus = "ready" | "typing" | "finished";

const TEST_DURATION_SECONDS = 60;

export function Game({ runtime }: GameProps) {
  const [passageIndex, setPassageIndex] = useState<number>(0);
  const [targetText, setTargetText] = useState<string>(() => getRandomPassage(0));
  const [typedText, setTypedText] = useState<string>("");
  const [status, setStatus] = useState<GameStatus>("ready");
  const [timeLeft, setTimeLeft] = useState<number>(TEST_DURATION_SECONDS);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [result, setResult] = useState<TypingResult | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input automatically on mount or state change
  useEffect(() => {
    if (status !== "finished") {
      inputRef.current?.focus();
    }
  }, [status]);

  // Restart / Reset game state
  const handleReset = useCallback(() => {
    const nextIdx = (passageIndex + 1) % 4;
    setPassageIndex(nextIdx);
    setTargetText(getRandomPassage(nextIdx));
    setTypedText("");
    setStatus("ready");
    setTimeLeft(TEST_DURATION_SECONDS);
    setStartTime(null);
    setResult(null);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, [passageIndex]);

  // Complete game & submit score via runtime
  const handleCompleteGame = useCallback(
    (finalTyped: string, elapsedMs: number) => {
      setStatus("finished");
      const finalResult = calculateTypingResult(targetText, finalTyped, elapsedMs);
      setResult(finalResult);

      const now = Date.now();
      void runtime.complete({
        gameId: manifest.id,
        sessionId: runtime.sessionId,
        score: finalResult.scoreWpm,
        durationMs: elapsedMs,
        metadata: {
          wpm: finalResult.scoreWpm,
          cpm: finalResult.cpm,
          accuracy: finalResult.accuracy,
          correctChars: finalResult.correctChars,
          incorrectChars: finalResult.incorrectChars,
          totalTypedChars: finalResult.totalTypedChars,
          durationMs: finalResult.durationMs,
        },
        clientStartedAt: startTime ?? now,
        clientEndedAt: now,
      });
      runtime.emit({ type: "game_completed", at: now });
    },
    [runtime, targetText, startTime],
  );

  // 60-second Timer Loop
  useEffect(() => {
    if (status !== "typing" || !startTime) return;

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      const remainingSec = Math.max(0, TEST_DURATION_SECONDS - Math.floor(elapsedMs / 1000));

      setTimeLeft(remainingSec);

      if (remainingSec <= 0) {
        clearInterval(interval);
        handleCompleteGame(typedText, elapsedMs);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [status, startTime, typedText, handleCompleteGame]);

  // Handle typing input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (status === "finished") return;

    const value = e.target.value;

    // First keypress starts the test
    if (status === "ready" && value.length > 0) {
      setStatus("typing");
      const now = Date.now();
      setStartTime(now);
      runtime.emit({ type: "game_started", at: now });
    }

    setTypedText(value);

    // If passage is fully typed
    if (value.length >= targetText.length && startTime) {
      const elapsedMs = Date.now() - startTime;
      handleCompleteGame(value, elapsedMs);
    }
  };

  // Live statistics calculation
  const currentElapsedMs = startTime ? Date.now() - startTime : 1;
  const liveResult = calculateTypingResult(targetText, typedText, currentElapsedMs);

  return (
    <div
      className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-4 md:p-8 select-none font-sans"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Top Header & Stats Card */}
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-raised border border-border/80 rounded-2xl p-4 flex flex-col items-center shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
            남은 시간
          </span>
          <span className="text-2xl md:text-3xl font-black text-brand-light">
            {timeLeft}
            <span className="text-xs ml-1 text-text-secondary">초</span>
          </span>
        </div>

        <div className="bg-surface-raised border border-border/80 rounded-2xl p-4 flex flex-col items-center shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
            속도 (WPM)
          </span>
          <span className="text-2xl md:text-3xl font-black text-emerald-400">
            {status === "finished" && result ? result.scoreWpm : liveResult.scoreWpm}
          </span>
        </div>

        <div className="bg-surface-raised border border-border/80 rounded-2xl p-4 flex flex-col items-center shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
            타수 (CPM)
          </span>
          <span className="text-2xl md:text-3xl font-black text-amber-400">
            {status === "finished" && result ? result.cpm : liveResult.cpm}
          </span>
        </div>

        <div className="bg-surface-raised border border-border/80 rounded-2xl p-4 flex flex-col items-center shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
            정확도
          </span>
          <span className="text-2xl md:text-3xl font-black text-indigo-400">
            {status === "finished" && result ? result.accuracy : liveResult.accuracy}%
          </span>
        </div>
      </div>

      {/* Main Interactive Passage Arena */}
      <div className="w-full bg-surface-raised border border-border/80 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden mb-6">
        {/* Visual Text Highlight Passage */}
        <div className="text-lg md:text-2xl font-mono leading-relaxed tracking-wide min-h-[140px] flex flex-wrap content-start">
          {targetText.split("").map((char, index) => {
            let colorClass = "text-text-muted/60";
            let bgClass = "";

            if (index < typedText.length) {
              const isCorrect = typedText[index] === char;
              colorClass = isCorrect
                ? "text-emerald-400 font-bold"
                : "text-rose-400 bg-rose-500/20 rounded font-bold";
            } else if (index === typedText.length && status !== "finished") {
              bgClass = "bg-brand/40 underline underline-offset-4 animate-pulse rounded";
              colorClass = "text-text-primary font-bold";
            }

            return (
              <span key={index} className={`${colorClass} ${bgClass} transition-colors px-[1px]`}>
                {char}
              </span>
            );
          })}
        </div>

        {/* Hidden Input for Keyboard Typing */}
        <input
          ref={inputRef}
          type="text"
          value={typedText}
          onChange={handleInputChange}
          onPaste={(e) => e.preventDefault()}
          disabled={status === "finished"}
          className="absolute inset-0 opacity-0 cursor-default"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />

        {status === "ready" && (
          <div className="mt-6 pt-4 border-t border-border/40 text-center text-sm font-semibold text-text-muted animate-bounce">
            ⌨️ 키보드를 눌러 타자 속도 테스트를 바로 시작하세요!
          </div>
        )}
      </div>

      {/* Completion Modal Summary */}
      {status === "finished" && result && (
        <div className="w-full bg-surface-overlay/90 backdrop-blur-md border border-brand/40 rounded-3xl p-6 md:p-8 flex flex-col items-center text-center shadow-2xl animate-fade-in mb-6">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-2xl md:text-3xl font-black text-text-primary mb-2">
            타자 테스트 완료!
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            60초 동안 기록한 당신의 타자 측정 결과입니다.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl mb-8">
            <div className="bg-surface-raised/80 p-4 rounded-2xl border border-border">
              <span className="text-xs text-text-muted font-bold block mb-1">최종 WPM</span>
              <span className="text-3xl font-black text-emerald-400">{result.scoreWpm}</span>
            </div>
            <div className="bg-surface-raised/80 p-4 rounded-2xl border border-border">
              <span className="text-xs text-text-muted font-bold block mb-1">최종 CPM</span>
              <span className="text-3xl font-black text-amber-400">{result.cpm}</span>
            </div>
            <div className="bg-surface-raised/80 p-4 rounded-2xl border border-border">
              <span className="text-xs text-text-muted font-bold block mb-1">정확도</span>
              <span className="text-3xl font-black text-indigo-400">{result.accuracy}%</span>
            </div>
            <div className="bg-surface-raised/80 p-4 rounded-2xl border border-border">
              <span className="text-xs text-text-muted font-bold block mb-1">총 입력 타수</span>
              <span className="text-3xl font-black text-text-primary">
                {result.correctChars}{" "}
                <span className="text-xs text-rose-400">({result.incorrectChars}오타)</span>
              </span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-brand hover:bg-brand-hover text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer"
            >
              🔄 다시 도전하기
            </button>
          </div>
        </div>
      )}

      {/* Control Actions */}
      {status !== "finished" && (
        <div className="flex gap-4">
          <button
            onClick={handleReset}
            className="px-5 py-2.5 bg-surface-raised hover:bg-surface-overlay border border-border/80 text-text-secondary hover:text-text-primary font-bold text-sm rounded-xl transition-all cursor-pointer"
          >
            🔄 문장 새로고침 / 다시 시작
          </button>
        </div>
      )}
    </div>
  );
}

export default Game;
