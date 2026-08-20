import type { GameVersion } from "../domain/gameVersion.js";

/** Read boundary for the generic version store. A-4 keeps USER review/publish mutations on the
 * existing SandboxGameRepository while migration triggers converge provider-neutral fields. */
export interface GameVersionRepository {
  findById(id: number): Promise<GameVersion | null>;
  listByGameId(gameId: number): Promise<readonly GameVersion[]>;
  findForGame(gameId: number, versionId: number): Promise<GameVersion | null>;
}
