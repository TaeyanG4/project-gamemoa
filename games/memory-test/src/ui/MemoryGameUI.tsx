import { useState, useEffect } from "react";
import { Play, RotateCcw, Brain } from "lucide-react";
import { 
  type MemoryColor, 
  generateNextColor, 
  evaluateGrade, 
  createInitialState 
} from "../engine/memoryEngine";

export function MemoryGameUI() {
  const [gameState, setGameState] = useState(createInitialState());
  const [activeColor, setActiveColor] = useState<MemoryColor | null>(null);

  const startNewGame = () => {
    const firstColor = generateNextColor();
    setGameState({
      status: "showing",
      sequence: [firstColor],
      userIndex: 0,
      level: 1,
      bestLevel: gameState.bestLevel,
    });
  };

  // Play sequence animation when status is "showing"
  useEffect(() => {
    if (gameState.status !== "showing") return;

    let isCancelled = false;

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    async function playSequence() {
      // 400ms initial delay before starting sequence playback
      await sleep(400);

      for (let i = 0; i < gameState.sequence.length; i++) {
        if (isCancelled) return;

        const color = gameState.sequence[i];

        // 1. Turn ON highlight
        setActiveColor(color);
        await sleep(550);

        if (isCancelled) return;

        // 2. Turn OFF highlight (gap between flashes for repeated colors)
        setActiveColor(null);
        await sleep(250);
      }

      if (!isCancelled) {
        setGameState((prev) => ({ ...prev, status: "user-turn" }));
      }
    }

    void playSequence();

    return () => {
      isCancelled = true;
      setActiveColor(null);
    };
  }, [gameState.status, gameState.sequence]);

  const handleColorClick = (color: MemoryColor) => {
    if (gameState.status !== "user-turn") return;

    setActiveColor(color);
    setTimeout(() => setActiveColor(null), 250);

    const expectedColor = gameState.sequence[gameState.userIndex];

    if (color !== expectedColor) {
      // Game Over
      const grade = evaluateGrade(gameState.level - 1);
      const newBest = Math.max(gameState.bestLevel, gameState.level - 1);
      
      setGameState((prev) => ({
        ...prev,
        status: "game-over",
        bestLevel: newBest,
      }));
      return;
    }

    // Correct Click
    if (gameState.userIndex + 1 === gameState.sequence.length) {
      // Completed current level, add next step
      const nextColor = generateNextColor();
      setTimeout(() => {
        setGameState((prev) => ({
          status: "showing",
          sequence: [...prev.sequence, nextColor],
          userIndex: 0,
          level: prev.level + 1,
          bestLevel: Math.max(prev.bestLevel, prev.level),
        }));
      }, 500);
    } else {
      setGameState((prev) => ({ ...prev, userIndex: prev.userIndex + 1 }));
    }
  };

  const grade = evaluateGrade(gameState.level - 1);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-6 bg-surface-raised rounded-3xl border border-border shadow-2xl select-none">
      {/* Header Info */}
      <div className="flex items-center justify-between w-full mb-6 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-accent-green" />
          <span className="font-extrabold text-lg text-text-primary">순서 기억력</span>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold">
          <div className="px-3 py-1.5 rounded-xl bg-surface border border-border/80 text-text-secondary">
            단계: <span className="text-accent-green text-sm">{gameState.level}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-surface border border-border/80 text-text-secondary">
            최고: <span className="text-brand-light text-sm">{gameState.bestLevel}</span>
          </div>
        </div>
      </div>

      {/* Main Play Area */}
      {gameState.status === "idle" && (
        <div className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="w-20 h-20 rounded-full bg-accent-green/10 text-accent-green flex items-center justify-center shadow-lg shadow-accent-green/20">
            <Brain className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-text-primary">순서 기억력 테스트</h3>
          <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
            화면에 깜빡이는 색상 순서를 잘 기억하고 순서대로 똑같이 누르세요!
          </p>
          <button
            onClick={startNewGame}
            className="flex items-center gap-2 px-8 py-3.5 bg-accent-green text-white font-extrabold rounded-2xl shadow-xl shadow-accent-green/30 hover:scale-105 transition-all cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            게임 시작
          </button>
        </div>
      )}

      {(gameState.status === "showing" || gameState.status === "user-turn") && (
        <div className="flex flex-col items-center gap-6 w-full py-2">
          {/* Status Notification Badge */}
          <div className="h-9 flex items-center justify-center px-5 rounded-full bg-surface border border-border text-xs font-black shadow-inner">
            {gameState.status === "showing" ? (
              activeColor === "red" ? (
                <span className="text-red-400 animate-bounce">🔴 빨간색!</span>
              ) : activeColor === "green" ? (
                <span className="text-emerald-400 animate-bounce">🟢 초록색!</span>
              ) : activeColor === "blue" ? (
                <span className="text-blue-400 animate-bounce">🔵 파란색!</span>
              ) : activeColor === "yellow" ? (
                <span className="text-amber-400 animate-bounce">🟡 노란색!</span>
              ) : (
                <span className="text-text-muted animate-pulse">👀 순서를 잘 기억하세요...</span>
              )
            ) : (
              <span className="text-accent-green">
                👉 순서대로 누르세요 ({gameState.userIndex + 1} / {gameState.sequence.length})
              </span>
            )}
          </div>

          {/* 4-Color Grid */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs aspect-square p-2">
            {/* Red Button */}
            <button
              onClick={() => handleColorClick("red")}
              disabled={gameState.status !== "user-turn"}
              className={`rounded-3xl border-2 transition-all duration-200 cursor-pointer flex items-center justify-center font-black text-lg ${
                activeColor === "red"
                  ? "bg-red-500 border-white text-white shadow-[0_0_40px_rgba(239,68,68,0.9)] scale-105 ring-4 ring-white z-10"
                  : "bg-red-950/40 border-red-500/30 text-red-400 hover:bg-red-900/50"
              }`}
            >
              RED
            </button>

            {/* Green Button */}
            <button
              onClick={() => handleColorClick("green")}
              disabled={gameState.status !== "user-turn"}
              className={`rounded-3xl border-2 transition-all duration-200 cursor-pointer flex items-center justify-center font-black text-lg ${
                activeColor === "green"
                  ? "bg-emerald-500 border-white text-white shadow-[0_0_40px_rgba(16,185,129,0.9)] scale-105 ring-4 ring-white z-10"
                  : "bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/50"
              }`}
            >
              GREEN
            </button>

            {/* Blue Button */}
            <button
              onClick={() => handleColorClick("blue")}
              disabled={gameState.status !== "user-turn"}
              className={`rounded-3xl border-2 transition-all duration-200 cursor-pointer flex items-center justify-center font-black text-lg ${
                activeColor === "blue"
                  ? "bg-blue-500 border-white text-white shadow-[0_0_40px_rgba(59,130,246,0.9)] scale-105 ring-4 ring-white z-10"
                  : "bg-blue-950/40 border-blue-500/30 text-blue-400 hover:bg-blue-900/50"
              }`}
            >
              BLUE
            </button>

            {/* Yellow Button */}
            <button
              onClick={() => handleColorClick("yellow")}
              disabled={gameState.status !== "user-turn"}
              className={`rounded-3xl border-2 transition-all duration-200 cursor-pointer flex items-center justify-center font-black text-lg ${
                activeColor === "yellow"
                  ? "bg-amber-400 border-white text-slate-950 shadow-[0_0_40px_rgba(245,158,11,0.9)] scale-105 ring-4 ring-white z-10"
                  : "bg-amber-950/40 border-amber-500/30 text-amber-400 hover:bg-amber-900/50"
              }`}
            >
              YELLOW
            </button>
          </div>
        </div>
      )}

      {gameState.status === "game-over" && (
        <div className="flex flex-col items-center gap-6 py-8 text-center animate-in zoom-in-95 duration-200">
          <div className="px-4 py-1.5 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/30 text-xs font-bold">
            틀렸습니다!
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-4xl font-black text-text-primary">
              Level {gameState.level - 1}
            </span>
            <span className="text-xs text-text-muted">달성 등급: {grade}등급</span>
          </div>

          <button
            onClick={startNewGame}
            className="flex items-center gap-2 px-8 py-3.5 bg-brand text-white font-extrabold rounded-2xl shadow-xl shadow-brand/30 hover:scale-105 transition-all cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            다시 도전하기
          </button>
        </div>
      )}
    </div>
  );
}
