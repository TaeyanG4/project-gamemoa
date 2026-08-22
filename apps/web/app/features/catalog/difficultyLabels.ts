import type { Dictionary } from "../i18n/dictionary";

/** "normal"/"hard" are generic platform labels; any other label comes from the public API. */
export function localizedDifficultyLabel(
  id: string,
  fallbackLabel: string,
  dict: Dictionary["gamePlay"],
): string {
  if (id === "normal") return dict.difficultyNormal;
  if (id === "hard") return dict.difficultyHard;
  return fallbackLabel;
}
