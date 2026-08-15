export interface TypingResult {
  scoreWpm: number;
  cpm: number;
  accuracy: number;
  correctChars: number;
  incorrectChars: number;
  totalTypedChars: number;
  durationMs: number;
}

// Kept as the default/legacy pool — English "quote"-style passages. `getRandomPassage()` (no
// mode argument) still reads from this exact array so existing callers/tests are unaffected.
export const TYPING_PASSAGES = [
  "The quick brown fox jumps over the lazy dog. Swift decision making and precision typing will elevate your mental agility to peak performance.",
  "Programming is the art of telling a computer what to do. Clean code always looks like it was written by someone who cares.",
  "In the world of technology, speed and accuracy are twin virtues. Focus on rhythm and momentum to achieve your highest typing speed.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. Keep practicing to improve your daily words per minute.",
];

/** Selectable before a round starts — 한국어 단문/장문 vs English Quote/Word. */
export type TypingMode = "ko-short" | "ko-long" | "en-quote" | "en-word";

export const TYPING_MODES: readonly TypingMode[] = ["ko-short", "ko-long", "en-quote", "en-word"];

export const TYPING_MODE_LABELS: Record<TypingMode, string> = {
  "ko-short": "한국어 · 단문",
  "ko-long": "한국어 · 장문",
  "en-quote": "English · Quote",
  "en-word": "English · Word",
};

const KO_SHORT_PASSAGES = [
  "오늘도 좋은 하루 보내세요.",
  "빠른 갈색 여우가 게으른 개를 뛰어넘는다.",
  "연습이 완벽을 만든다.",
  "시작이 반이다.",
  "천 리 길도 한 걸음부터 시작된다.",
  "쉬지 않고 흐르는 물이 결국 바위를 뚫는다.",
];

const KO_LONG_PASSAGES = [
  "타자 연습은 손가락의 움직임과 머리의 판단이 하나로 이어지는 과정입니다. 처음에는 느리더라도 정확하게 입력하는 습관을 들이면, 시간이 지날수록 자연스럽게 속도가 붙습니다.",
  "새로운 기술을 배울 때 가장 중요한 것은 꾸준함입니다. 매일 조금씩이라도 연습하는 사람은 어느 순간 눈에 띄게 성장한 자신을 발견하게 됩니다.",
  "좋은 코드는 군더더기 없이 명확하게 의도를 드러냅니다. 타이핑 속도만큼이나 정확성과 리듬을 유지하는 것이 실력 향상의 핵심입니다.",
  "성공은 끝이 아니고 실패는 치명적이지 않습니다. 중요한 것은 계속할 수 있는 용기이며, 그 용기는 매일의 작은 연습에서 시작됩니다.",
];

// "Word mode" (MonkeyType-style): no sentence structure, just a shuffled run of common short
// English words joined by single spaces — generated fresh each time via getPassageForMode.
const EN_WORD_POOL = [
  "the",
  "of",
  "and",
  "a",
  "to",
  "in",
  "is",
  "you",
  "that",
  "it",
  "he",
  "was",
  "for",
  "on",
  "are",
  "as",
  "with",
  "his",
  "they",
  "at",
  "be",
  "this",
  "have",
  "from",
  "or",
  "one",
  "had",
  "by",
  "word",
  "but",
  "not",
  "what",
  "all",
  "were",
  "we",
  "when",
  "your",
  "can",
  "said",
  "there",
  "use",
  "each",
  "which",
  "she",
  "do",
  "how",
  "their",
  "if",
  "will",
  "up",
  "other",
  "about",
  "out",
  "many",
  "then",
  "them",
  "these",
  "so",
  "some",
  "her",
  "would",
  "make",
  "like",
  "into",
  "time",
  "has",
  "look",
  "two",
  "more",
  "write",
  "go",
  "see",
  "number",
  "no",
  "way",
  "could",
  "people",
  "than",
  "first",
  "water",
  "been",
  "call",
  "who",
  "its",
  "now",
  "find",
  "long",
  "down",
];

// Fisher-Yates-lite: enough words for a comfortable line, order re-shuffled every call so word
// mode never repeats the same sequence twice in a row.
const WORD_MODE_COUNT = 40;
function generateWordModePassage(): string {
  const pool = [...EN_WORD_POOL];
  const picked: string[] = [];
  for (let i = 0; i < WORD_MODE_COUNT && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const [word] = pool.splice(idx, 1);
    if (word) picked.push(word);
  }
  return picked.join(" ");
}

export function getRandomPassage(index?: number): string {
  if (typeof index === "number" && index >= 0 && index < TYPING_PASSAGES.length) {
    const passage = TYPING_PASSAGES[index];
    if (passage) return passage;
  }
  const randomIndex = Math.floor(Math.random() * TYPING_PASSAGES.length);
  return TYPING_PASSAGES[randomIndex] ?? TYPING_PASSAGES[0] ?? "";
}

/** Mode-aware passage picker used once a language/length mode has been selected. Word mode
 * ignores `index` and generates a fresh shuffled sequence every call; the sentence-based modes
 * cycle deterministically by index (mirrors getRandomPassage's existing behavior). */
export function getPassageForMode(mode: TypingMode, index?: number): string {
  if (mode === "en-word") return generateWordModePassage();

  const pool =
    mode === "ko-short"
      ? KO_SHORT_PASSAGES
      : mode === "ko-long"
        ? KO_LONG_PASSAGES
        : TYPING_PASSAGES;
  if (typeof index === "number") {
    const passage = pool[index % pool.length];
    if (passage) return passage;
  }
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex] ?? pool[0] ?? "";
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
