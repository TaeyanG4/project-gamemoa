import type { ComponentType } from "react";
import type { GameManifest } from "./manifest.js";
import type { GameResult, GameResultValidation } from "./result.js";
import type { GameClientEvent } from "../events/index.js";

export interface GameRuntimeContext {
  readonly sessionId: string;
  readonly user: {
    readonly id: string;
    readonly displayName: string;
  } | null;
  readonly emit: (event: GameClientEvent) => void;
  readonly complete: (result: GameResult) => Promise<void>;
  readonly cancel: () => void;
}

export interface GameProps {
  readonly runtime: GameRuntimeContext;
}

export interface GameModule {
  readonly manifest: GameManifest;
  readonly Game: ComponentType<GameProps>;
  readonly validateResult?: ((result: GameResult) => Promise<GameResultValidation>) | undefined;
}
