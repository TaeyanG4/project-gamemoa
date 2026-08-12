import { useState, useEffect } from "react";
import { Play, RotateCcw, Brain } from "lucide-react";
import { 
  type MemoryColor, 
  generateNextColor, 
  evaluateGrade, 
  createInitialState 
} from "../engine/memoryEngine";

const COLOR_FREQS: Record<MemoryColor, number> = {
  red: 261.63,   // C4
  green: 329.63, // E4
  blue: 392.00,  // G4
  yellow: 523.25,// C5
};

function playTone(freq: number, duration = 0.3) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio context autoplay blocks gracefully
  }
}

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
      await sleep(500);

      for (let i = 0; i < gameState.sequence.length; i++) {
        if (isCancelled) return;

        const color = gameState.sequence[i];
        if (!color) continue;

        // 1. Turn ON highlight & sound
        setActiveColor(color);
        playTone(COLOR_FREQS[color], 0.35);
        await sleep(500);

        if (isCancelled) return;

        // 2. Turn OFF highlight (gap between flashes)
        setActiveColor(null);
        await sleep(200);
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
    playTone(COLOR_FREQS[color], 0.25);
    setTimeout(() => setActiveColor(null), 200);

    const expectedColor = gameState.sequence[gameState.userIndex];

    if (color !== expectedColor) {
      // Game Over
      playTone(150, 0.5); // Low error tone
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
      }, 600);
    } else {
      setGameState((prev) => ({ ...prev, userIndex: prev.userIndex + 1 }));
    }
  };

  const grade = evaluateGrade(gameState.level - 1);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-6 md:p-8 bg-gradient-to-b from-[#18181b] via-[#0f0f12] to-[#09090b] rounded-[2.5rem] border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] select-none">
      {/* Header Info */}
      <div className="flex items-center justify-between w-full mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-accent-green/10 text-accent-green border border-accent-green/20">
            <Brain className="w-5 h-5" />
          </div>
          <span className="font-black text-lg tracking-tight text-white">순서 기억력 패드</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end px-3 py-1 rounded-xl bg-black/40 border border-white/10">
            <span className="text-[10px] text-text-muted font-bold uppercase">Level</span>
            <span className="text-sm font-black text-accent-green">{gameState.level}</span>
          </div>
          <div className="flex flex-col items-end px-3 py-1 rounded-xl bg-black/40 border border-white/10">
            <span className="text-[10px] text-text-muted font-bold uppercase">Best</span>
            <span className="text-sm font-black text-accent-yellow">{gameState.bestLevel}</span>
          </div>
        </div>
      </div>

      {/* Main Play Area */}
      {gameState.status === "idle" && (
        <div className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-accent-green/20 via-brand/10 to-accent-green/20 text-accent-green flex items-center justify-center border border-accent-green/30 shadow-[0_0_40px_rgba(16,185,129,0.25)]">
            <Brain className="w-12 h-12" />
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-2xl font-black text-white tracking-tight">아케이드 순서 기억력</h3>
            <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
              깜빡이는 4색 아케이드 패드의 패턴을 기억하고 순서대로 똑같이 눌러보세요!
            </p>
          </div>

          <button
            onClick={startNewGame}
            className="flex items-center gap-2.5 px-8 py-4 bg-gradient-to-r from-accent-green via-emerald-500 to-teal-500 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-accent-green/30 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>게임 시작</span>
          </button>
        </div>
      )}

      {(gameState.status === "showing" || gameState.status === "user-turn") && (
        <div className="flex flex-col items-center gap-6 w-full py-2">
          {/* Status Indicator Bar */}
          <div className="h-10 flex items-center justify-center px-6 rounded-full bg-black/60 border border-white/10 text-xs font-black shadow-inner tracking-wide">
            {gameState.status === "showing" ? (
              <span className="text-accent-yellow animate-pulse flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-yellow animate-ping" />
                👀 패턴 관찰 중...
              </span>
            ) : (
              <span className="text-accent-green flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-green" />
                👉 순서대로 누르세요 ({gameState.userIndex + 1} / {gameState.sequence.length})
              </span>
            )}
          </div>

          {/* 3D Simon Arcade Pad Matrix (Fixed Height & Width to prevent flex collapse) */}
          <div className="relative w-[270px] h-[270px] sm:w-[300px] sm:h-[300px] rounded-full bg-black border-[10px] border-[#18181b] shadow-[0_0_40px_rgba(0,0,0,0.8)] flex items-center justify-center p-3 select-none">
            <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-3 bg-black rounded-full overflow-hidden">
              {/* RED PAD (Top Left) */}
              <button
                onClick={() => handleColorClick("red")}
                disabled={gameState.status !== "user-turn"}
                aria-label="Red Pad"
                className={`relative w-full h-full rounded-tl-full border-2 transition-all duration-150 cursor-pointer overflow-hidden ${
                  activeColor === "red"
                    ? "bg-gradient-to-br from-red-400 via-red-500 to-red-600 border-white shadow-[inset_0_4px_15px_rgba(255,255,255,0.4),0_0_50px_rgba(239,68,68,0.8)] z-20 ring-4 ring-white/50"
                    : "bg-gradient-to-br from-red-800/80 via-red-950 to-[#180505] border-red-500/30 hover:bg-red-800/90 shadow-[inset_0_4px_12px_rgba(255,255,255,0.1)]"
                }`}
              >
                <div className="absolute top-1/3 left-1/3 w-8 h-8 rounded-full bg-white/10 blur-[6px] pointer-events-none" />
              </button>

              {/* GREEN PAD (Top Right) */}
              <button
                onClick={() => handleColorClick("green")}
                disabled={gameState.status !== "user-turn"}
                aria-label="Green Pad"
                className={`relative w-full h-full rounded-tr-full border-2 transition-all duration-150 cursor-pointer overflow-hidden ${
                  activeColor === "green"
                    ? "bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 border-white shadow-[inset_0_4px_15px_rgba(255,255,255,0.4),0_0_50px_rgba(16,185,129,0.8)] z-20 ring-4 ring-white/50"
                    : "bg-gradient-to-br from-emerald-800/80 via-emerald-950 to-[#05180d] border-emerald-500/30 hover:bg-emerald-800/90 shadow-[inset_0_4px_12px_rgba(255,255,255,0.1)]"
                }`}
              >
                <div className="absolute top-1/3 right-1/3 w-8 h-8 rounded-full bg-white/10 blur-[6px] pointer-events-none" />
              </button>

              {/* BLUE PAD (Bottom Left) */}
              <button
                onClick={() => handleColorClick("blue")}
                disabled={gameState.status !== "user-turn"}
                aria-label="Blue Pad"
                className={`relative w-full h-full rounded-bl-full border-2 transition-all duration-150 cursor-pointer overflow-hidden ${
                  activeColor === "blue"
                    ? "bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 border-white shadow-[inset_0_4px_15px_rgba(255,255,255,0.4),0_0_50px_rgba(59,130,246,0.8)] z-20 ring-4 ring-white/50"
                    : "bg-gradient-to-br from-blue-800/80 via-blue-950 to-[#050b18] border-blue-500/30 hover:bg-blue-800/90 shadow-[inset_0_4px_12px_rgba(255,255,255,0.1)]"
                }`}
              >
                <div className="absolute bottom-1/3 left-1/3 w-8 h-8 rounded-full bg-white/10 blur-[6px] pointer-events-none" />
              </button>

              {/* YELLOW PAD (Bottom Right) */}
              <button
                onClick={() => handleColorClick("yellow")}
                disabled={gameState.status !== "user-turn"}
                aria-label="Yellow Pad"
                className={`relative w-full h-full rounded-br-full border-2 transition-all duration-150 cursor-pointer overflow-hidden ${
                  activeColor === "yellow"
                    ? "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 border-white shadow-[inset_0_4px_15px_rgba(255,255,255,0.4),0_0_50px_rgba(245,158,11,0.8)] z-20 ring-4 ring-white/50"
                    : "bg-gradient-to-br from-amber-800/80 via-amber-950 to-[#181205] border-amber-500/30 hover:bg-amber-800/90 shadow-[inset_0_4px_12px_rgba(255,255,255,0.1)]"
                }`}
              >
                <div className="absolute bottom-1/3 right-1/3 w-8 h-8 rounded-full bg-white/10 blur-[6px] pointer-events-none" />
              </button>
            </div>

            {/* Center Digital LED Console Hub */}
            <div className="absolute w-[100px] h-[100px] sm:w-[110px] sm:h-[110px] rounded-full bg-gradient-to-b from-[#18181b] to-[#09090b] border-[8px] sm:border-[10px] border-black shadow-[0_0_30px_rgba(0,0,0,1)] flex flex-col items-center justify-center pointer-events-none z-30">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1">STAGE</span>
              <span className="text-2xl sm:text-3xl font-black text-accent-green font-mono">
                {String(gameState.level).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      )}

      {gameState.status === "game-over" && (
        <div className="flex flex-col items-center gap-6 py-6 text-center animate-in zoom-in-95 duration-200">
          <div className="px-4 py-1 rounded-full bg-accent-red/20 text-accent-red border border-accent-red/30 text-xs font-black">
            게임 종료!
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-5xl font-black text-white">
              Level {gameState.level - 1}
            </span>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-xs text-text-muted">달성 등급:</span>
              <span className="px-3 py-0.5 rounded-lg bg-brand/20 text-brand-light font-black border border-brand/30">
                {grade}등급
              </span>
            </div>
          </div>

          <button
            onClick={startNewGame}
            className="flex items-center gap-2 px-8 py-3.5 bg-brand text-white font-extrabold rounded-2xl shadow-xl shadow-brand/30 hover:scale-105 transition-all cursor-pointer border border-white/20"
          >
            <RotateCcw className="w-5 h-5" />
            <span>다시 도전하기</span>
          </button>
        </div>
      )}
    </div>
  );
}
