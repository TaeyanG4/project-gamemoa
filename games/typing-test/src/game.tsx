import { useState, useEffect, useRef, useCallback } from "react";
import type { GameProps } from "@owogg/game-sdk";
import {
  getPassageForMode,
  calculateTypingResult,
  computeSegmentStats,
  TYPING_MODES,
  TYPING_MODE_LABELS,
  type TypingMode,
  type TypingResult,
} from "./logic.js";
import { manifest } from "./manifest.js";

// "select" (language/length picker) happens once, before the first keystroke starts the timer —
// same 60-second round as before, just with a mode chosen up front instead of always English.
type GameStatus = "select" | "ready" | "typing" | "finished";

const TEST_DURATION_SECONDS = 60;

export function Game({ runtime }: GameProps) {
  const [mode, setMode] = useState<TypingMode | null>(null);
  const [targetText, setTargetText] = useState<string>("");
  const [typedText, setTypedText] = useState<string>("");
  const [status, setStatus] = useState<GameStatus>("select");
  const [timeLeft, setTimeLeft] = useState<number>(TEST_DURATION_SECONDS);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Cumulative character counts across segments
  const [cumulativeCorrect, setCumulativeCorrect] = useState<number>(0);
  const [cumulativeIncorrect, setCumulativeIncorrect] = useState<number>(0);
  const [cumulativeTyped, setCumulativeTyped] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input automatically once a mode is picked (there's nothing to type during "select")
  useEffect(() => {
    if (status !== "finished" && status !== "select") {
      inputRef.current?.focus();
    }
  }, [status]);

  const handleSelectMode = useCallback((selected: TypingMode) => {
    setMode(selected);
    setTargetText(getPassageForMode(selected, 0));
    setStatus("ready");
  }, []);

  // Complete game & submit score via runtime
  const handleCompleteGame = useCallback(
    (extraCorrect: number, extraIncorrect: number, extraTyped: number, elapsedMs: number) => {
      setStatus("finished");
      const totalCorrect = cumulativeCorrect + extraCorrect;
      const totalIncorrect = cumulativeIncorrect + extraIncorrect;
      const totalTyped = cumulativeTyped + extraTyped;

      const finalResult: TypingResult = calculateTypingResult(
        totalCorrect,
        totalIncorrect,
        totalTyped,
        elapsedMs,
      );

      const now = Date.now();
      void runtime.complete({
        gameId: manifest.id,
        sessionId: runtime.sessionId,
        score: finalResult.scoreWpm,
        durationMs: finalResult.durationMs,
        metadata: {
          wpm: finalResult.scoreWpm,
          cpm: finalResult.cpm,
          accuracy: finalResult.accuracy,
          correctChars: finalResult.correctChars,
          incorrectChars: finalResult.incorrectChars,
          totalTypedChars: finalResult.totalTypedChars,
          durationMs: finalResult.durationMs,
          mode: mode ?? undefined,
        },
        clientStartedAt: startTime ?? now - elapsedMs,
        clientEndedAt: now,
      });
      runtime.emit({ type: "game_completed", at: now });
    },
    [runtime, startTime, cumulativeCorrect, cumulativeIncorrect, cumulativeTyped, mode],
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
        const segment = computeSegmentStats(targetText, typedText);
        handleCompleteGame(
          segment.correctChars,
          segment.incorrectChars,
          segment.totalTypedChars,
          elapsedMs,
        );
      }
    }, 200);

    return () => clearInterval(interval);
  }, [status, startTime, targetText, typedText, handleCompleteGame]);

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

    // Check if current passage segment has been fully typed
    if (value.length >= targetText.length && startTime) {
      const segment = computeSegmentStats(targetText, value);
      setCumulativeCorrect((prev) => prev + segment.correctChars);
      setCumulativeIncorrect((prev) => prev + segment.incorrectChars);
      setCumulativeTyped((prev) => prev + segment.totalTypedChars);

      // Advance to next passage segment without stopping timer
      setTargetText(getPassageForMode(mode ?? "en-quote"));
      setTypedText("");
      return;
    }

    setTypedText(value);
  };

  // Live statistics calculation
  const currentElapsedMs = startTime ? Date.now() - startTime : 1;
  const currentSegment = computeSegmentStats(targetText, typedText);
  const liveResult = calculateTypingResult(
    cumulativeCorrect + currentSegment.correctChars,
    cumulativeIncorrect + currentSegment.incorrectChars,
    cumulativeTyped + currentSegment.totalTypedChars,
    currentElapsedMs,
  );

  // Language/length picker shown once, before the timer or any passage exists.
  if (status === "select") {
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-2xl mx-auto p-4 md:p-8 select-none font-sans text-center">
        <h3 className="text-2xl font-black text-text-primary mb-2">타자 속도 테스트</h3>
        <p className="text-sm text-text-muted mb-8">
          언어와 지문 길이를 선택하면 60초 테스트가 시작됩니다.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {TYPING_MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleSelectMode(m)}
              className="px-6 py-5 bg-surface-raised hover:bg-surface-overlay border border-border/80 hover:border-brand/60 rounded-2xl font-extrabold text-text-primary transition-all cursor-pointer shadow-lg hover:-translate-y-0.5"
            >
              {TYPING_MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto p-4 md:p-8 select-none font-sans"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Top Header & Live Stats Card */}
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
            {liveResult.scoreWpm}
          </span>
        </div>

        <div className="bg-surface-raised border border-border/80 rounded-2xl p-4 flex flex-col items-center shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
            타수 (CPM)
          </span>
          <span className="text-2xl md:text-3xl font-black text-amber-400">{liveResult.cpm}</span>
        </div>

        <div className="bg-surface-raised border border-border/80 rounded-2xl p-4 flex flex-col items-center shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
            정확도
          </span>
          <span className="text-2xl md:text-3xl font-black text-indigo-400">
            {liveResult.accuracy}%
          </span>
        </div>
      </div>

      {/* Main Interactive Passage Arena */}
      <div className="w-full bg-surface-raised border border-border/80 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden mb-6">
        {/* Visual Text Highlight Passage with Preserved Whitespace */}
        <div className="text-lg md:text-2xl font-mono leading-relaxed tracking-wide min-h-[140px] whitespace-pre-wrap flex flex-wrap content-start select-none">
          {targetText.split("").map((expectedChar, index) => {
            let colorClass = "text-text-muted/60";
            let bgClass = "";
            let displayChar = expectedChar === " " ? "\u00A0" : expectedChar;

            if (index < typedText.length) {
              const actualChar = typedText[index];
              const isCorrect = actualChar === expectedChar;

              if (isCorrect) {
                colorClass = "text-emerald-400 font-bold";
                displayChar = actualChar === " " ? "\u00A0" : actualChar;
              } else {
                // Render the ACTUAL typed character in error style
                colorClass =
                  "text-rose-400 font-bold bg-rose-500/25 rounded border-b-2 border-amber-400";
                displayChar = actualChar === " " ? "␣" : (actualChar ?? expectedChar);
              }
            } else if (index === typedText.length && status !== "finished") {
              bgClass = "bg-brand/40 underline underline-offset-4 animate-pulse rounded";
              colorClass = "text-text-primary font-bold";
            }

            return (
              <span
                key={index}
                className={`${colorClass} ${bgClass} transition-colors px-[1px] relative inline-block`}
                title={
                  index < typedText.length && typedText[index] !== expectedChar
                    ? `입력: '${typedText[index]}' (기대: '${expectedChar}')`
                    : undefined
                }
              >
                {displayChar}
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
            ⌨️ 키보드를 눌러 60초 타자 속도 테스트를 바로 시작하세요!
          </div>
        )}
      </div>
    </div>
  );
}

export default Game;
