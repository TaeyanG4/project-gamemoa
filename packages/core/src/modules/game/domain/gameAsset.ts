/** Provider-neutral game-level media metadata. Bytes stay in the existing object store; D1 only
 * records which object belongs to which generic game identity. */
export const GAME_ASSET_KINDS = ["LOGO"] as const;
export type GameAssetKind = (typeof GAME_ASSET_KINDS)[number];

export interface GameAsset {
  readonly gameId: number;
  readonly kind: GameAssetKind;
  readonly objectKey: string;
  readonly updatedAt: string;
}
