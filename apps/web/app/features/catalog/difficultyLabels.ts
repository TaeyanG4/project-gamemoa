import type { Dictionary } from "../i18n/dictionary";

/** "normal"/"hard" are reused verbatim across every difficulty-supporting game, so they're
 * localized generically here rather than per-game (dict.gameContent overlay) — anything else
 * falls back to the manifest's own (Korean-only) label. */
export function localizedDifficultyLabel(
  id: string,
  fallbackLabel: string,
  dict: Dictionary["gamePlay"],
): string {
  if (id === "normal") return dict.difficultyNormal;
  if (id === "hard") return dict.difficultyHard;
  return fallbackLabel;
}
