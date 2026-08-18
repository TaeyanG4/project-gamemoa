import test from "node:test";
import assert from "node:assert/strict";
import { GameSettingsUseCases } from "../src/application/gameSettingsUseCases.js";
import { StaticGameRegistry } from "../src/modules/game/registry/staticGameRegistry.js";
import { GAME_DEFINITIONS } from "../src/registry/gameDefinitions.generated.js";
import type { GameSettingsRepository, GameSettingRecord } from "../src/ports/repositories.js";

class FakeGameSettingsRepository implements GameSettingsRepository {
  private overrides = new Map<string, GameSettingRecord>();

  async getDisabledGameIds(): Promise<string[]> {
    return [...this.overrides.values()].filter((o) => !o.enabled).map((o) => o.gameId);
  }

  async getAllOverrides(): Promise<GameSettingRecord[]> {
    return [...this.overrides.values()];
  }

  async setEnabled(
    gameId: string,
    enabled: boolean,
    disabledReason: string | null,
    updatedByAdminId: number,
  ): Promise<GameSettingRecord> {
    const record: GameSettingRecord = {
      gameId,
      enabled,
      disabledReason,
      updatedByAdminId,
      updatedAt: new Date().toISOString(),
    };
    this.overrides.set(gameId, record);
    return record;
  }
}

/** The real production registry, same reasoning as scoreUseCases.test.ts's `newUseCases` — this
 * is what makes the tests below an equivalence check against the four official games' actual
 * enable/disable behaviour, not just a shape check against synthetic data. */
function newUseCases(): { useCases: GameSettingsUseCases; repo: FakeGameSettingsRepository } {
  const repo = new FakeGameSettingsRepository();
  return {
    useCases: new GameSettingsUseCases(repo, new StaticGameRegistry(GAME_DEFINITIONS)),
    repo,
  };
}

test("listAll returns every registry game as enabled when nothing has ever been overridden", async () => {
  const { useCases } = newUseCases();
  const all = await useCases.listAll();

  assert.equal(all.length, GAME_DEFINITIONS.length);
  for (const game of all) {
    assert.equal(game.enabled, true, game.gameId);
    assert.equal(game.disabledReason, null, game.gameId);
  }
});

test("listAll reports title/status from the registry, and gameId from its slug", async () => {
  const { useCases } = newUseCases();
  const all = await useCases.listAll();

  const reactionTime = all.find((g) => g.gameId === "reaction-time");
  const definition = GAME_DEFINITIONS.find((d) => d.slug === "reaction-time");
  assert.ok(reactionTime && definition);
  assert.equal(reactionTime.title, definition.title);
  assert.equal(reactionTime.status, definition.status);
});

test("setEnabled(false) disables a known game and getDisabledGameIds reflects it", async () => {
  const { useCases } = newUseCases();

  const result = await useCases.setEnabled("aim-test", false, "점검 중", 9);
  assert.equal(result.ok, true);

  const disabled = await useCases.getDisabledGameIds();
  assert.deepEqual(disabled, ["aim-test"]);

  const all = await useCases.listAll();
  const aimTest = all.find((g) => g.gameId === "aim-test");
  assert.equal(aimTest?.enabled, false);
  assert.equal(aimTest?.disabledReason, "점검 중");
  assert.equal(aimTest?.updatedByAdminId, 9);
});

test("setEnabled refuses a game id the registry doesn't know, without writing an override", async () => {
  const { useCases, repo } = newUseCases();

  const result = await useCases.setEnabled("some-sandbox-game-slug", false, null, 9);
  assert.deepEqual(result, { ok: false, code: "GAME_NOT_FOUND" });
  assert.deepEqual(await repo.getAllOverrides(), []);
});

test("re-enabling a previously disabled game clears it from getDisabledGameIds", async () => {
  const { useCases } = newUseCases();

  await useCases.setEnabled("typing-test", false, "테스트", 1);
  assert.deepEqual(await useCases.getDisabledGameIds(), ["typing-test"]);

  await useCases.setEnabled("typing-test", true, null, 1);
  assert.deepEqual(await useCases.getDisabledGameIds(), []);
});

test("disabling one game never touches another's enabled state", async () => {
  const { useCases } = newUseCases();
  await useCases.setEnabled("memory-test", false, null, 1);

  const all = await useCases.listAll();
  for (const game of all) {
    if (game.gameId === "memory-test") continue;
    assert.equal(game.enabled, true, game.gameId);
  }
});

// ── the registry-scoping property this refactor establishes ─────────────────

test("GameSettingsUseCases only ever reaches games the injected registry actually resolves", async () => {
  const definitions = GAME_DEFINITIONS.slice(0, 1); // pretend only one game is registered
  const repo = new FakeGameSettingsRepository();
  const useCases = new GameSettingsUseCases(repo, new StaticGameRegistry(definitions));

  const all = await useCases.listAll();
  assert.equal(all.length, 1);
  assert.equal(all[0]?.gameId, definitions[0]?.slug);

  // A real official-game slug this particular registry was never given is NOT_FOUND, exactly
  // like an unknown one — GameSettingsUseCases must not fall back to any other source.
  const otherSlug = GAME_DEFINITIONS[1]?.slug;
  assert.ok(otherSlug);
  const result = await useCases.setEnabled(otherSlug, false, null, 1);
  assert.deepEqual(result, { ok: false, code: "GAME_NOT_FOUND" });
});
