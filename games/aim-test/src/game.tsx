import { useState, useCallback, useRef } from "react";
import type { GameProps } from "@owogg/game-sdk";
import { Target, RotateCcw, Play } from "lucide-react";
import {
  TOTAL_TARGETS,
  generateRandomPercentagePos,
  calculateAverageMs,
  getTargetSizePx,
  type TargetPercentagePos,
} from "./logic.js";

export function Game({ runtime }: GameProps) {
  const [phase, setPhase] = useState<"ready" | "playing" | "finished">("ready");
  const [targetCount, setTargetCount] = useState(0);
  const [targetPos, setTargetPos] = useState<TargetPercentagePos>({ xPercent: 50, yPercent: 50 });
  const [totalMs, setTotalMs] = useState<number | null>(null);
  // Captured once when a round starts (not read fresh every render) — changing the difficulty
  // selector mid-round must never resize an already-in-progress attempt's targets.
  const [targetSizePx, setTargetSizePx] = useState(() => getTargetSizePx(runtime.difficultyId));

  const startTimeRef = useRef<number>(0);

  const handleStart = useCallback(() => {
    setPhase("playing");
    setTargetCount(1);
    setTargetPos(generateRandomPercentagePos());
    setTargetSizePx(getTargetSizePx(runtime.difficultyId));
    startTimeRef.current = Date.now();
    runtime.emit({ type: "game_started", at: Date.now() });
  }, [runtime]);

  const handleTargetClick = useCallback(() => {
    if (phase !== "playing") return;

    if (targetCount >= TOTAL_TARGETS) {
      const endTime = Date.now();
      const elapsedMs = endTime - startTimeRef.current;
      setTotalMs(elapsedMs);
      setPhase("finished");

      void runtime.complete({
        gameId: "aim-test",
        sessionId: runtime.sessionId,
        score: elapsedMs,
        durationMs: elapsedMs,
        metadata: {
          targets: TOTAL_TARGETS,
          avgPerTargetMs: calculateAverageMs(elapsedMs, TOTAL_TARGETS),
          difficultyId: runtime.difficultyId,
        },
        clientStartedAt: startTimeRef.current,
        clientEndedAt: endTime,
      });
      runtime.emit({ type: "game_completed", at: endTime });
    } else {
      setTargetCount((prev) => prev + 1);
      setTargetPos(generateRandomPercentagePos());
    }
  }, [phase, targetCount, runtime]);

  const handleRetry = useCallback(() => {
    setPhase("ready");
    setTargetCount(0);
    setTotalMs(null);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center w-full select-none">
      {/* Top Info Bar */}
      <div className="flex items-center justify-between w-full max-w-4xl mb-4 px-2">
        <span className="text-sm font-bold text-text-secondary flex items-center gap-1.5">
          <Target className="w-4 h-4 text-brand" />
          {phase === "playing" ? `${targetCount} / ${TOTAL_TARGETS}` : "에임 테스트"}
        </span>
        {totalMs !== null && (
          <span className="text-sm font-black text-brand-light">
            총 시간: {totalMs}ms (평균 {calculateAverageMs(totalMs)}ms)
          </span>
        )}
      </div>

      {/* Responsive Arena */}
      <div className="relative w-full max-w-4xl aspect-[16/10] min-h-[380px] md:min-h-[480px] rounded-2xl bg-surface-sidebar border border-border overflow-hidden cursor-crosshair shadow-inner">
        {phase === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/60 backdrop-blur-sm z-10">
            <h3 className="text-2xl font-black text-white mb-2">에임 테스트</h3>
            <p className="text-xs text-text-muted max-w-xs mb-6">
              화면에 무작위로 생성되는 30개의 타겟을 최대한 빠르고 정확하게 클릭하세요!
            </p>
            <button
              type="button"
              onClick={handleStart}
              className="px-6 py-3 bg-brand hover:bg-brand-light text-white font-extrabold rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>테스트 시작</span>
            </button>
          </div>
        )}

        {phase === "playing" && (
          <button
            type="button"
            onClick={handleTargetClick}
            style={{
              left: `${targetPos.xPercent}%`,
              top: `${targetPos.yPercent}%`,
              width: `${targetSizePx}px`,
              height: `${targetSizePx}px`,
              transform: "translate(-50%, -50%)",
            }}
            className="absolute rounded-full bg-gradient-to-tr from-rose-500 to-red-400 border-2 border-white shadow-lg flex items-center justify-center transition-transform duration-75 active:scale-90 cursor-pointer animate-pulse"
            aria-label="Target"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-white" />
          </button>
        )}

        {phase === "finished" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/80 backdrop-blur-sm z-10">
            <h3 className="text-3xl font-black text-white mb-1">테스트 완료!</h3>
            <p className="text-4xl font-black text-brand mb-2">{totalMs} ms</p>
            <p className="text-xs text-text-muted mb-6">
              타겟당 평균 반응시간: {totalMs !== null ? calculateAverageMs(totalMs) : 0} ms
            </p>

            <button
              type="button"
              onClick={handleRetry}
              className="px-6 py-2.5 bg-surface-raised hover:bg-surface-overlay text-text-primary border border-border font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>다시 도전</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
