import { GAME_MANIFESTS } from "../registry/gameRegistry.generated.js";
import type { GameSettingsRepository, GameSettingRecord } from "../ports/repositories.js";

export interface GameAvailability {
  gameId: string;
  title: string;
  /** The manifest's own static status (draft/beta/published/hidden) — for context only, the
   * live `enabled` flag below is what actually gates play/scoring/catalog visibility. */
  status: string;
  enabled: boolean;
  disabledReason: string | null;
  updatedByAdminId: number | null;
  updatedAt: string | null;
}

export type SetGameEnabledResult =
  { ok: true; record: GameSettingRecord } | { ok: false; code: "GAME_NOT_FOUND" };

export class GameSettingsUseCases {
  constructor(private repo: GameSettingsRepository) {}

  /** Every known game (from the manifest registry) merged with its live override, if any —
   * used by the admin games panel. */
  async listAll(): Promise<GameAvailability[]> {
    const overrides = await this.repo.getAllOverrides();
    const overrideByGameId = new Map(overrides.map((o) => [o.gameId, o]));

    return GAME_MANIFESTS.map((manifest) => {
      const override = overrideByGameId.get(manifest.id);
      return {
        gameId: manifest.id,
        title: manifest.title,
        status: manifest.status,
        enabled: override ? override.enabled : true,
        disabledReason: override?.disabledReason ?? null,
        updatedByAdminId: override?.updatedByAdminId ?? null,
        updatedAt: override?.updatedAt ?? null,
      };
    });
  }

  /** Public-safe: just the set of game_ids an admin has explicitly turned off. Used to filter
   * the catalog and gate score submission — never exposes who disabled it or why. */
  async getDisabledGameIds(): Promise<string[]> {
    return this.repo.getDisabledGameIds();
  }

  async setEnabled(
    gameId: string,
    enabled: boolean,
    reason: string | null,
    adminId: number,
  ): Promise<SetGameEnabledResult> {
    if (!GAME_MANIFESTS.some((m) => m.id === gameId)) {
      return { ok: false, code: "GAME_NOT_FOUND" };
    }
    const record = await this.repo.setEnabled(gameId, enabled, reason, adminId);
    return { ok: true, record };
  }
}
