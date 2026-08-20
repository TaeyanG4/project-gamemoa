import type { GameAsset, GameAssetKind } from "../domain/gameAsset.js";

/** Read-only provider-neutral boundary for game-level media metadata. Asset bytes are served by
 * the existing GameBundleStorageRepository; this port never exposes storage keys publicly. */
export interface GameAssetRepository {
  findByGameId(gameId: number, kind: GameAssetKind): Promise<GameAsset | null>;
}
