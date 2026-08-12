export interface TypingResult {
  scoreWpm: number;
  cpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  totalTypedChars: number;
  durationMs: number;
}

export const TYPING_PASSAGES = [
  "The quick brown fox jumps over the lazy dog. Swift decision making and precision typing will elevate your mental agility to peak performance.",
  "Programming is the art of telling a computer what to do. Clean code always looks like it was written by someone who cares.",
  "In the world of technology, speed and accuracy are twin virtues. Focus on rhythm and momentum to achieve your highest typing speed.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. Keep practicing to improve your daily words per minute.",
];

export function getRandomPassage(index?: number): string {
  if (typeof index === "number" && index >= 0 && index < TYPING_PASSAGES.length) {
    const passage = TYPING_PASSAGES[index];
    if (passage) return passage;
  }
  const randomIndex = Math.floor(Math.random() * TYPING_PASSAGES.length);
  return TYPING_PASSAGES[randomIndex] ?? TYPING_PASSAGES[0] ?? "";
}

export function calculateWpm(correctChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0 || correctChars <= 0) return 0;
  const elapsedMinutes = elapsedMs / 60000;
  const words = correctChars / 5;
  return Math.max(0, Math.round(words / elapsedMinutes));
}

export function calculateCpm(totalChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0 || totalChars <= 0) return 0;
  const elapsedMinutes = elapsedMs / 60000;
  return Math.max(0, Math.round(totalChars / elapsedMinutes));
}

export function calculateAccuracy(correctChars: number, totalTypedChars: number): number {
  if (totalTypedChars <= 0) return 100;
  if (correctChars <= 0) return 0;
  const ratio = (correctChars / totalTypedChars) * 100;
  return Math.min(100, Math.max(0, Math.round(ratio)));
}

export function calculateTypingResult(
  cumulativeCorrect: number,
  cumulativeIncorrect: number,
  cumulativeTyped: number,
  elapsedMs: number,
): TypingResult {
  const safeElapsed = Math.max(1, elapsedMs);
  const scoreWpm = calculateWpm(cumulativeCorrect, safeElapsed);
  const cpm = calculateCpm(cumulativeTyped, safeElapsed);
  const accuracy = calculateAccuracy(cumulativeCorrect, cumulativeTyped);

  return {
    scoreWpm,
    cpm,
    accuracy,
    correctChars: cumulativeCorrect,
    incorrectChars: cumulativeIncorrect,
    totalTypedChars: cumulativeTyped,
    durationMs: safeElapsed,
  };
}

export function computeSegmentStats(
  targetText: string,
  typedText: string,
): { correctChars: number; incorrectChars: number; totalTypedChars: number } {
  let correctChars = 0;
  let incorrectChars = 0;
  const len = typedText.length;
  for (let i = 0; i < len; i++) {
    if (typedText[i] === targetText[i]) {
      correctChars++;
    } else {
      incorrectChars++;
    }
  }
  return {
    correctChars,
    incorrectChars,
    totalTypedChars: len,
  };
}
