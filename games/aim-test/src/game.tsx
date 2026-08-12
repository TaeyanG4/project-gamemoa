import { useState } from "react";

export interface AimTestGameProps {
  onFinish?: (score: number) => void;
}

export function AimTestGame({ onFinish }: AimTestGameProps) {
  const [score, setScore] = useState<number | null>(null);

  const handleComplete = () => {
    const finalTimeMs = Math.floor(Math.random() * 500) + 1200;
    setScore(finalTimeMs);
    onFinish?.(finalTimeMs);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-900 text-white rounded-xl">
      <h2 className="text-2xl font-bold mb-4">에임 테스트</h2>
      {score === null ? (
        <button
          onClick={handleComplete}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold cursor-pointer"
        >
          타겟 조준 시작
        </button>
      ) : (
        <div className="text-center">
          <p className="text-xl mb-4">평균 타겟 반응 시간: <span className="font-bold text-indigo-400">{score} ms</span></p>
          <button
            onClick={() => setScore(null)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
          >
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
}
