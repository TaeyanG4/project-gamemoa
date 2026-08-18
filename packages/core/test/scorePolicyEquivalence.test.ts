import test from "node:test";
import assert from "node:assert/strict";
import { GAME_MANIFESTS, validateScoreByManifest } from "../src/registry/gameRegistry.generated.js";
import { GAME_DEFINITIONS } from "../src/registry/gameDefinitions.generated.js";
import { StaticGameRegistry } from "../src/modules/game/registry/staticGameRegistry.js";
import { validateScoreAgainstPolicy } from "../src/domain/scoreValidation.js";
import { ScoreUseCases } from "../src/application/scoreUseCases.js";
import type {
  Score,
  ScoreRepository,
  UserPersonalBestAggregate,
} from "../src/ports/repositories.js";

/**
 * Direct A/B equivalence for every official game, not a rewrite of the same expected numbers in
 * two places: for every boundary this generates, both the OLD path (`validateScoreByManifest`,
 * still generated and exported — nothing in this migration removes it) and the NEW path
 * (`validateScoreAgainstPolicy`, driven by the injected `GameRegistry`) are asked the same
 * question, and the assertion is that their answers agree. If a future change to either path ever
 * drifts, this is what catches it — not a human re-deriving the same bound twice.
 */

const definitionBySlug = new Map(GAME_DEFINITIONS.map((d) => [d.slug, d]));

function boundaryScoresFor(min: number, max: number): number[] {
  const candidates = [min - 1, min, min + 1, Math.floor((min + max) / 2), max - 1, max, max + 1];
  // De-dupe and drop anything that would itself violate the unrelated "non-negative" rule, since
  // that rule is asserted identically for both paths separately (see the negative-score test).
  return [...new Set(candidates)].filter((n) => n >= 0);
}

test("every official game's score policy produces identical verdicts on both the old and new validation paths", () => {
  assert.ok(GAME_MANIFESTS.length > 0);

  for (const manifest of GAME_MANIFESTS) {
    const definition = definitionBySlug.get(manifest.slug);
    assert.ok(definition, `no game-registry definition for ${manifest.slug}`);

    const probes = manifest.scoreConfig
      ? boundaryScoresFor(manifest.scoreConfig.min, manifest.scoreConfig.max)
      : [0, 1, 999999]; // unscored: any non-negative integer must pass both paths

    for (const score of probes) {
      const oldResult = validateScoreByManifest(manifest.slug, score);
      const newResult = validateScoreAgainstPolicy(definition.policy, score);
      assert.equal(
        newResult.valid,
        oldResult.valid,
        `${manifest.slug} score=${score}: old.valid=${oldResult.valid} new.valid=${newResult.valid}`,
      );
    }
  }
});

test("a game id absent from both registries is rejected identically by both paths", () => {
  const unknownSlug = "some-sandbox-game-slug";
  const oldResult = validateScoreByManifest(unknownSlug, 100);
  const newResult = validateScoreAgainstPolicy(null, 100); // null = GameRegistry.findBySlug miss

  assert.equal(oldResult.valid, false);
  assert.equal(newResult.valid, false);
});

// ── end-to-end through ScoreUseCases, against the real production registry ──

class FakeScoreRepository implements ScoreRepository {
  scores: Score[] = [];
  async saveScore(data: {
    userId: number;
    nickname: string;
    avatarUrl?: string | null;
    gameId: string;
    score: number;
    difficulty: string;
  }): Promise<Score> {
    const saved: Score = {
      id: this.scores.length + 1,
      user_id: data.userId,
      nickname: data.nickname,
      avatar_url: data.avatarUrl ?? null,
      game_id: data.gameId,
      score: data.score,
      difficulty: data.difficulty,
      created_at: new Date().toISOString(),
    };
    this.scores.push(saved);
    return saved;
  }
  async getLeaderboard(): Promise<Score[]> {
    return [];
  }
  async getUserPersonalBests(): Promise<UserPersonalBestAggregate[]> {
    return [];
  }
}

test("submitScore's end-to-end accept/reject verdict matches validateScoreByManifest for every official game", async () => {
  for (const manifest of GAME_MANIFESTS) {
    const useCases = new ScoreUseCases(
      new FakeScoreRepository(),
      new StaticGameRegistry(GAME_DEFINITIONS),
    );
    const probes = manifest.scoreConfig
      ? boundaryScoresFor(manifest.scoreConfig.min, manifest.scoreConfig.max)
      : [0, 1];

    for (const score of probes) {
      const expected = validateScoreByManifest(manifest.slug, score).valid;
      const actual = await useCases.submitScore({
        userId: 1,
        gameId: manifest.slug,
        score,
        nickname: "T",
      });
      assert.equal(
        actual.valid,
        expected,
        `${manifest.slug} score=${score}: submitScore.valid=${actual.valid} expected=${expected}`,
      );
    }
  }
});

test("every declared difficulty tier round-trips through submitScore for every game that has one", async () => {
  for (const manifest of GAME_MANIFESTS) {
    if (!manifest.difficulty) continue;
    const useCases = new ScoreUseCases(
      new FakeScoreRepository(),
      new StaticGameRegistry(GAME_DEFINITIONS),
    );
    const validScore = manifest.scoreConfig
      ? Math.floor((manifest.scoreConfig.min + manifest.scoreConfig.max) / 2)
      : 0;

    for (const level of manifest.difficulty.levels) {
      const result = await useCases.submitScore({
        userId: 1,
        gameId: manifest.slug,
        score: validScore,
        nickname: "T",
        difficulty: level.id,
      });
      assert.equal(result.valid, true, `${manifest.slug} difficulty=${level.id}`);
      assert.equal(result.saved?.difficulty, level.id);
    }

    // An id the manifest never declared must still be rejected end-to-end.
    const rejected = await useCases.submitScore({
      userId: 1,
      gameId: manifest.slug,
      score: validScore,
      nickname: "T",
      difficulty: "definitely-not-a-real-tier",
    });
    assert.equal(rejected.valid, false, manifest.slug);
  }
});
