import type { PublicGame } from "@owogg/contracts";
import type { Dictionary } from "../i18n/dictionary";

export interface PublicGameCard {
  readonly slug: string;
  readonly title: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly modes: readonly string[];
  readonly thumbnail: string;
  readonly accent?: string | undefined;
  readonly categories: readonly string[];
  readonly tags: readonly string[];
  readonly publisherType: PublicGame["publisherType"];
  readonly catalogType: PublicGame["catalog"]["type"];
  readonly genre?: string | undefined;
}

/** Web-only view model. It preserves GENRE_MODE as a real shape: no fake taxonomy categories,
 * tags, thumbnail, or player counts are manufactured for USER games. */
export function publicGameToCard(game: PublicGame, dict?: Dictionary): PublicGameCard {
  const localized = game.publisherType === "OWOGG" ? dict?.gameContent[game.slug] : undefined;
  if (game.catalog.type === "TAXONOMY") {
    return {
      slug: game.slug,
      title: localized?.title ?? game.title,
      shortDescription: localized?.shortDescription ?? game.shortDescription,
      description: game.description,
      modes: game.catalog.modes,
      thumbnail: game.mediaUrl ?? game.catalog.thumbnail,
      ...(game.catalog.accent !== undefined ? { accent: game.catalog.accent } : {}),
      categories: game.catalog.categories,
      tags: game.catalog.tags,
      publisherType: game.publisherType,
      catalogType: game.catalog.type,
    };
  }

  return {
    slug: game.slug,
    title: game.title,
    shortDescription: game.shortDescription,
    description: game.description,
    // GENRE_MODE only declares the coarse canonical single/multi vocabulary. Do not infer local
    // versus online multiplayer for a legacy card component that has no such source fact.
    modes: [game.catalog.mode],
    thumbnail: game.mediaUrl ?? "",
    categories: [],
    tags: [],
    publisherType: game.publisherType,
    catalogType: game.catalog.type,
    genre: game.catalog.genre,
  };
}
