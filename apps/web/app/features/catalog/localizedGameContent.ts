import type { Dictionary } from "../i18n/dictionary";
import type { PublicGameCard } from "./publicGameAdapter";

/** Public game metadata comes only from the D1/B2-backed API. Keep the dictionary parameter while
 * callers share one rendering path, but never overlay a slug-keyed catalog from the Web bundle. */
export function getLocalizedGameContent(_dict: Dictionary, game: PublicGameCard) {
  return {
    title: game.title,
    shortDescription: game.shortDescription,
    description: game.description,
    tags: game.tags,
  };
}
