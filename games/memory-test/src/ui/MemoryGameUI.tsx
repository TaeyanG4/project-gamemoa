import { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, Trophy, Brain } from "lucide-react";
import { 
  type MemoryColor, 
  generateNextColor, 
  evaluateGrade, 
  createInitialState 
} from "../engine/memoryEngine";

export function MemoryGameUI() {
  const [gameState, setGameState] = useState(createInitialState());
  const [activeColor, setActiveColor] = useState<MemoryColor | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    let step = 0;
    const interval = setInterval(() => {
      if (step < gameState.sequence.length) {
        const color = gameState.sequence[step];
        setActiveColor(color);
        setTimeout(() => setActiveColor(null), 400);
        step++;
      } else {
        clearInterval(interval);
        setGameState((prev) => ({ ...prev, status: "user-turn" }));
      }
    }, 700);

    return () => clearInterval(interval);
  }, [gameState.status, gameState.sequence]);

  const handleColorClick = (color: MemoryColor) => {
    if (gameState.status !== "user-turn") return;

    setActiveColor(color);
    setTimeout(() => setActiveColor(null), 200);

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
    <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto p-6 bg-surface-raised rounded-3xl border border-border shadow-2xl select-none">
      {/* Header Info */}
      <div className="flex items-center justify-between w-full mb-8 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-accent-green" />
          <span className="font-extrabold text-lg text-text-primary">기억력 테스트</span>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold">
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
        <div className="flex flex-col items-center gap-6 py-12 text-center">
          <div className="w-20 h-20 rounded-full bg-accent-green/10 text-accent-green flex items-center justify-center shadow-lg shadow-accent-green/20">
            <Brain className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-text-primary">순서 기억력 테스트</h3>
          <p className="text-sm text-text-secondary max-w-xs leading-relaxed">
            화면에 깜빡이는 색상 순서를 잘 기억하고 순서대로 눌러보세요!
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
        <div className="flex flex-col items-center gap-6 w-full py-4">
          <div className="text-xs font-bold px-4 py-1.5 rounded-full bg-surface border border-border text-text-secondary animate-pulse">
            {gameState.status === "showing" ? "👀 기억하세요..." : "👉 순서대로 누르세요!"}
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-xs aspect-square">
            <button
              onClick={() => handleColorClick("red")}
              disabled={gameState.status !== "user-turn"}
              className={`rounded-2xl border-2 border-red-500/30 transition-all duration-150 cursor-pointer shadow-lg ${
                activeColor === "red"
                  ? "bg-red-500 shadow-red-500/50 scale-95"
                  : "bg-red-950/40 hover:bg-red-900/60"
              }`}
            />
            <button
              onClick={() => handleColorClick("green")}
              disabled={gameState.status !== "user-turn"}
              className={`rounded-2xl border-2 border-emerald-500/30 transition-all duration-150 cursor-pointer shadow-lg ${
                activeColor === "green"
                  ? "bg-emerald-500 shadow-emerald-500/50 scale-95"
                  : "bg-emerald-950/40 hover:bg-emerald-900/60"
              }`}
            />
            <button
              onClick={() => handleColorClick("blue")}
              disabled={gameState.status !== "user-turn"}
              className={`rounded-2xl border-2 border-blue-500/30 transition-all duration-150 cursor-pointer shadow-lg ${
                activeColor === "blue"
                  ? "bg-blue-500 shadow-blue-500/50 scale-95"
                  : "bg-blue-950/40 hover:bg-blue-900/60"
              }`}
            />
            <button
              onClick={() => handleColorClick("yellow")}
              disabled={gameState.status !== "user-turn"}
              className={`rounded-2xl border-2 border-amber-500/30 transition-all duration-150 cursor-pointer shadow-lg ${
                activeColor === "yellow"
                  ? "bg-amber-400 shadow-amber-400/50 scale-95"
                  : "bg-amber-950/40 hover:bg-amber-900/60"
              }`}
            />
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
            <span className="text-xs text-text-muted">최고 등급: {grade}등급</span>
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
