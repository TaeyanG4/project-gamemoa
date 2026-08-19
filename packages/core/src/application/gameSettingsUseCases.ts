import type { GameSettingsRepository, GameSettingRecord } from "../ports/repositories.js";
import type { GameRegistry } from "../modules/game/ports/gameRegistry.js";

export interface GameAvailability {
  gameId: string;
  title: string;
  /** The registry's own static status (draft/beta/published/hidden) — for context only, the
   * live `enabled` flag below is what actually gates play/scoring/catalog visibility. */
  status: string;
  enabled: boolean;
  disabledReason: string | null;
  updatedByAdminId: number | null;
  updatedAt: string | null;
}

export type SetGameEnabledResult =
  { ok: true; record: GameSettingRecord } | { ok: false; code: "GAME_NOT_FOUND" };

/**
 * Resolves the set of known games through the injected {@link GameRegistry} rather than the
 * build-time `GAME_MANIFESTS` this class used to import directly — see ScoreUseCases's doc
 * comment for the same reasoning. The composition root wires this to `systemGameRegistry`
 * (SYSTEM-only), not the unified SYSTEM+CREATOR `CompositeGameRegistry` Stage C-3 added — the
 * admin kill switch's reach is unchanged: it still only ever covers the built-in games. That's
 * deliberate: nothing on the Creator serving/session/score path actually enforces this
 * `enabled`/`disabledReason` override yet, so listing a Creator game here would make the admin
 * panel show a toggle that does nothing — Creator kill-switch convergence is a later Stage.
 */
export class GameSettingsUseCases {
  constructor(
    private repo: GameSettingsRepository,
    private registry: GameRegistry,
  ) {}

  /** Every known game (from the registry) merged with its live override, if any — used by the
   * admin games panel. */
  async listAll(): Promise<GameAvailability[]> {
    const [definitions, overrides] = await Promise.all([
      this.registry.listAll(),
      this.repo.getAllOverrides(),
    ]);
    const overrideByGameId = new Map(overrides.map((o) => [o.gameId, o]));

    return definitions.map((definition) => {
      const override = overrideByGameId.get(definition.slug);
      return {
        gameId: definition.slug,
        title: definition.title,
        status: definition.status,
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
    if (!(await this.registry.findBySlug(gameId))) {
      return { ok: false, code: "GAME_NOT_FOUND" };
    }
    const record = await this.repo.setEnabled(gameId, enabled, reason, adminId);
    return { ok: true, record };
  }
}
