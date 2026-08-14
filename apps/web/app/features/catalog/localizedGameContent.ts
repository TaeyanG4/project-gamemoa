import type { GameManifest } from "@owogg/game-sdk";
import type { Dictionary } from "../i18n/dictionary";

/** GameManifest.title/shortDescription/description/tags stay Korean-only in the manifest itself
 * on purpose — that type is shared with apps/api (Discord bot embeds, score validation), which
 * has no access to the web app's client-side i18n dictionary. Localized display text for the web
 * UI lives separately in dict.gameContent, keyed by game slug, and gets overlaid here.
 *
 * Falls back to the manifest's own (Korean) text when a slug has no dict entry yet — e.g. a new
 * game added before its translation lands — so missing translations degrade gracefully instead
 * of crashing or rendering blank. */
export function getLocalizedGameContent(dict: Dictionary, game: GameManifest) {
  const content = dict.gameContent[game.slug];
  return {
    title: content?.title ?? game.title,
    shortDescription: content?.shortDescription ?? game.shortDescription,
    description: content?.description ?? game.description,
    tags: content?.tags ?? game.tags,
  };
}
