export type GameMode = "single" | "local-multi" | "online-multi";

export type GameStatus = "draft" | "beta" | "published" | "hidden";

export interface GameManifest {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly shortDescription: string;
  readonly description: string;
  readonly modes: readonly GameMode[];
  readonly status: GameStatus;
  readonly categories: readonly string[];
  readonly tags: readonly string[];
  readonly minPlayers: number;
  readonly maxPlayers: number;
  readonly thumbnail: string;
  readonly accent?: string | undefined;
  readonly estimatedRoundSeconds?: number | undefined;
  readonly requiresAuth: boolean;
  readonly supportsLeaderboard: boolean;
  readonly version: string;
}
