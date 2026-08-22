import type { GameManifest } from "@owogg/game-sdk";
import { GAME_MANIFESTS } from "@owogg/core";

export const gameManifests: GameManifest[] = GAME_MANIFESTS.filter(
  (m) => m.status === "published" || m.status === "beta",
);
