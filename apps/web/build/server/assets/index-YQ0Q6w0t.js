import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useRef, useCallback, useEffect } from "react";
const manifest = {
  id: "reaction-time",
  slug: "reaction-time",
  title: "반응속도 테스트",
  shortDescription: "화면이 바뀌면 최대한 빨리 클릭하세요!",
  description: "초록색 화면이 나타나는 순간 최대한 빨리 클릭하세요. 당신의 반응속도를 측정합니다.",
  modes: ["single"],
  status: "published",
  categories: ["반응", "측정"],
  tags: ["반응속도", "클릭", "타이밍"],
  minPlayers: 1,
  maxPlayers: 1,
  thumbnail: "/games/reaction-time/thumbnail.svg",
  accent: "#22c55e",
  estimatedRoundSeconds: 30,
  requiresAuth: false,
  supportsLeaderboard: true,
  version: "0.1.0"
};
const INITIAL_ROUND_STATE = {
  phase: "waiting",
  startedAt: null,
  greenAt: null,
  clickedAt: null,
  reactionTimeMs: null
};
const MIN_DELAY_MS = 1e3;
const MAX_DELAY_MS = 5e3;
function generateDelay() {
  return MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
}
function startRound(now) {
  return { ...INITIAL_ROUND_STATE, phase: "ready", startedAt: now };
}
function showGreen(state, now) {
  if (state.phase !== "ready") return state;
  return { ...state, phase: "go", greenAt: now };
}
function handleClick(state, now) {
  if (state.phase === "ready") {
    return { ...state, phase: "too-early", clickedAt: now };
  }
  if (state.phase === "go" && state.greenAt !== null) {
    const reactionTimeMs = now - state.greenAt;
    return { ...state, phase: "result", clickedAt: now, reactionTimeMs };
  }
  return state;
}
const NUM_ROUNDS = 5;
function calculateAverageReactionTime(times) {
  if (times.length === 0) return 0;
  const sum = times.reduce((a, b) => a + b, 0);
  return Math.round(sum / times.length);
}
function Game({ runtime }) {
  const [round, setRound] = useState(0);
  const [roundState, setRoundState] = useState(INITIAL_ROUND_STATE);
  const [results, setResults] = useState([]);
  const timerRef = useRef(null);
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
            clientEndedAt: Date.now()
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
  const getPhaseDisplay = () => {
    switch (roundState.phase) {
      case "waiting":
        return { bg: "bg-neutral-800", text: "클릭하여 시작", subtext: `${NUM_ROUNDS}라운드 진행` };
      case "ready":
        return { bg: "bg-red-600", text: "기다리세요...", subtext: "초록색이 되면 클릭!" };
      case "go":
        return { bg: "bg-green-500", text: "지금 클릭!", subtext: "" };
      case "too-early":
        return { bg: "bg-yellow-600", text: "너무 빨랐어요!", subtext: "클릭하여 다시 시도" };
      case "result":
        return {
          bg: "bg-blue-600",
          text: `${roundState.reactionTimeMs}ms`,
          subtext: results.length >= NUM_ROUNDS ? `평균: ${calculateAverageReactionTime(results)}ms` : `라운드 ${results.length}/${NUM_ROUNDS}`
        };
    }
  };
  const display = getPhaseDisplay();
  const isGameComplete = results.length >= NUM_ROUNDS;
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center min-h-[400px] w-full", children: [
    /* @__PURE__ */ jsxs("div", { className: "text-sm text-neutral-400 mb-4", children: [
      "라운드 ",
      Math.min(round + 1, NUM_ROUNDS),
      " / ",
      NUM_ROUNDS
    ] }),
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: roundState.phase === "too-early" ? startNewRound : roundState.phase === "result" && !isGameComplete ? handleNextRound : handleScreenClick,
        className: `w-full max-w-md aspect-[4/3] rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors duration-150 select-none ${display.bg}`,
        "aria-label": display.text,
        children: [
          /* @__PURE__ */ jsx("span", { className: "text-3xl font-bold text-white", children: display.text }),
          display.subtext && /* @__PURE__ */ jsx("span", { className: "text-lg text-white/80 mt-2", children: display.subtext })
        ]
      }
    ),
    results.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-6 flex gap-2 flex-wrap justify-center", children: results.map((ms, i) => /* @__PURE__ */ jsxs("span", { className: "px-3 py-1 bg-neutral-700 rounded-full text-sm text-neutral-200", children: [
      "R",
      i + 1,
      ": ",
      ms,
      "ms"
    ] }, i)) }),
    isGameComplete && /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: handleRetry,
        className: "mt-4 px-6 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white transition-colors",
        children: "다시 도전"
      }
    )
  ] });
}
const gameModule = {
  manifest,
  Game
};
export {
  Game,
  gameModule as default,
  manifest
};
