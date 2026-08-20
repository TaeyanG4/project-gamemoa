import type { GameAsset } from "./gameAsset.js";
import type { RuntimeGame } from "./runtimeGame.js";

/** Provider-neutral public projection. Publisher authority is reduced to a safe discriminant;
 * user ids, review state, storage keys, and live numeric ids never cross this boundary. */
export interface PublicGame {
  readonly publisherType: "OWOGG" | "USER";
  readonly slug: string;
  readonly title: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly catalog: RuntimeGame["canonical"]["catalog"];
  readonly policy: RuntimeGame["canonical"]["policy"];
  readonly presentation?: RuntimeGame["canonical"]["presentation"];
  readonly difficulty?: RuntimeGame["canonical"]["difficulty"];
  readonly supportsReplay: boolean;
  /** Public URL/path only; the D1 object key is intentionally never exposed. */
  readonly mediaUrl: string | null;
}

export function toPublicGame(runtime: RuntimeGame, mediaUrl: string | null): PublicGame {
  return {
    publisherType: runtime.identity.publisher.type,
    slug: runtime.identity.slug,
    title: runtime.canonical.title,
    shortDescription: runtime.canonical.shortDescription,
    description: runtime.canonical.description,
    catalog: runtime.canonical.catalog,
    policy: runtime.canonical.policy,
    ...(runtime.canonical.presentation !== undefined
      ? { presentation: runtime.canonical.presentation }
      : {}),
    ...(runtime.canonical.difficulty !== undefined
      ? { difficulty: runtime.canonical.difficulty }
      : {}),
    supportsReplay: runtime.canonical.supportsReplay,
    mediaUrl,
  };
}

/** Resolve the public media projection without leaking a storage key. TAXONOMY games keep the
 * canonical static thumbnail; USER game logos are served through the provider-neutral endpoint. */
export function publicGameMediaUrl(
  runtime: RuntimeGame,
  asset: GameAsset | null,
  mediaEndpoint: string,
): string | null {
  if (runtime.canonical.catalog.type === "TAXONOMY") {
    return runtime.canonical.catalog.thumbnail;
  }
  return asset?.kind === "LOGO" ? mediaEndpoint : null;
}
