import test from "node:test";
import assert from "node:assert/strict";
import {
  GameRegistryValidationError,
  parseGameDefinition,
  parseGamePolicy,
} from "./game-registry-schema.js";
import {
  assertDefinitionsMatchManifests,
  assertUniqueSlugs,
  loadGameDefinitions,
} from "./registry-builder.js";
import type { GameDefinition } from "../packages/core/src/modules/game/domain/gameDefinition.js";
import type { GameManifest } from "../packages/game-sdk/src/contracts/manifest.js";

const VALID_INFO = {
  slug: "sample-game",
  title: "샘플 게임",
  shortDescription: "짧은 설명",
  description: "긴 설명",
  status: "published",
  categories: ["reaction"],
  tags: ["샘플"],
  modes: ["single"],
  inputMethods: ["mouse"],
  minPlayers: 1,
  maxPlayers: 1,
  thumbnail: "/games/sample-game/thumbnail.svg",
  supportsReplay: false,
};

const VALID_POLICY = {
  score: { unit: "ms", direction: "asc", min: 50, max: 10000, displaySuffix: " ms" },
  leaderboard: true,
  xpPerCompletion: 0,
  requiresAuth: false,
};

function parse(info: unknown = VALID_INFO, policy: unknown = VALID_POLICY): GameDefinition {
  return parseGameDefinition({
    slug: "sample-game",
    infoFile: "game-registry/games/sample-game/info.json",
    policyFile: "game-registry/games/sample-game/policy.json",
    info,
    policy,
    owner: { type: "SYSTEM" },
  });
}

/** Asserts the parse fails and that the message names the file and the field, since these errors
 * are read by a person editing JSON by hand. */
function assertRejects(run: () => unknown, expected: RegExp): void {
  assert.throws(run, (err: unknown) => {
    assert.ok(
      err instanceof GameRegistryValidationError,
      `expected a validation error, got ${err}`,
    );
    assert.match(err.message, /^game-registry\/games\/sample-game\//);
    assert.match(err.message, expected);
    return true;
  });
}

test("a complete, valid entry parses into a GameDefinition", () => {
  const definition = parse();
  assert.equal(definition.slug, "sample-game");
  assert.deepEqual(definition.owner, { type: "SYSTEM" });
  assert.equal(definition.policy.score?.direction, "asc");
  assert.equal(definition.policy.leaderboard, true);
});

test("owner comes from the caller, never from the data file", () => {
  // A file declaring its own owner must not be able to promote itself to SYSTEM. The field is
  // simply not part of the schema, so supplying it is a hard error rather than being ignored.
  assertRejects(() => parse({ ...VALID_INFO, owner: { type: "SYSTEM" } }), /unknown field "owner"/);
});

test("an unknown field is rejected rather than silently ignored", () => {
  // A typo'd field that does nothing is worse than a build failure: it looks configured.
  assertRejects(() => parse({ ...VALID_INFO, supportsReplays: false }), /unknown field/);
  assertRejects(
    () => parse(VALID_INFO, { ...VALID_POLICY, xpPerCompletionn: 5 }),
    /unknown field "xpPerCompletionn"/,
  );
});

test("slug must match its directory name", () => {
  assertRejects(
    () => parse({ ...VALID_INFO, slug: "different-name" }),
    /does not match its directory name/,
  );
});

test("slug must satisfy the same rule a creator-submitted slug does", () => {
  assertRejects(() => parse({ ...VALID_INFO, slug: "ab" }), /slug must be 3-64 characters/);
  for (const bad of ["Sample-Game", "sample_game", "sample game", "sample.game"]) {
    assertRejects(() => parse({ ...VALID_INFO, slug: bad }), /slug must match/);
  }
});

test("a missing required field names the field", () => {
  const { title: _title, ...withoutTitle } = VALID_INFO;
  assertRejects(() => parse(withoutTitle), /title is required/);

  const { leaderboard: _lb, ...withoutLeaderboard } = VALID_POLICY;
  assertRejects(() => parse(VALID_INFO, withoutLeaderboard), /leaderboard is required/);
});

test("enum fields reject unknown values and list what is allowed", () => {
  assertRejects(() => parse({ ...VALID_INFO, status: "live" }), /status must be one of/);
  assertRejects(
    () => parse({ ...VALID_INFO, modes: ["co-op"] }),
    /modes contains unknown value "co-op"/,
  );
  assertRejects(
    () => parse({ ...VALID_INFO, inputMethods: ["gamepad"] }),
    /inputMethods contains unknown value "gamepad"/,
  );
});

test("an empty modes or inputMethods list is rejected", () => {
  assertRejects(() => parse({ ...VALID_INFO, modes: [] }), /modes must list at least one value/);
});

test("player counts must be coherent", () => {
  assertRejects(() => parse({ ...VALID_INFO, minPlayers: 0 }), /minPlayers must be at least 1/);
  assertRejects(
    () => parse({ ...VALID_INFO, minPlayers: 4, maxPlayers: 2 }),
    /maxPlayers \(2\) must be >= minPlayers \(4\)/,
  );
});

// ── score policy ─────────────────────────────────────────────────────────────

test("an inverted score range is rejected — it would reject every score the game can produce", () => {
  assertRejects(
    () =>
      parse(VALID_INFO, { ...VALID_POLICY, score: { ...VALID_POLICY.score, min: 100, max: 50 } }),
    /min \(100\) must be less than max \(50\)/,
  );
  assertRejects(
    () =>
      parse(VALID_INFO, { ...VALID_POLICY, score: { ...VALID_POLICY.score, min: 50, max: 50 } }),
    /must be less than/,
  );
});

test("an unscored game must say so explicitly with null, not by omission", () => {
  const { score: _score, ...withoutScore } = VALID_POLICY;
  assertRejects(() => parse(VALID_INFO, withoutScore), /score is required \(use null/);

  const unscored = parse(VALID_INFO, { ...VALID_POLICY, score: null, leaderboard: false });
  assert.equal(unscored.policy.score, null);
});

test("a leaderboard with no score policy is rejected — there would be nothing to rank", () => {
  assertRejects(
    () => parse(VALID_INFO, { ...VALID_POLICY, score: null, leaderboard: true }),
    /nothing to rank/,
  );
});

test("xpPerCompletion is bounded, so a stray zero fails the build rather than inflating XP", () => {
  // XP cannot be un-granted (docs/GAME_CREATION_GUIDE.md §3.5), so this is a typo guard.
  assertRejects(
    () => parse(VALID_INFO, { ...VALID_POLICY, xpPerCompletion: 1_000_000 }),
    /xpPerCompletion must be between 0 and 100000/,
  );
  assertRejects(
    () => parse(VALID_INFO, { ...VALID_POLICY, xpPerCompletion: -1 }),
    /xpPerCompletion must be between/,
  );
});

test("parseGamePolicy is usable on its own and reports its own file", () => {
  assert.throws(
    () => parseGamePolicy("game-registry/games/x/policy.json", { leaderboard: true }),
    // assert.throws matches a RegExp against String(err), which is prefixed with "Error: ".
    /^Error: game-registry\/games\/x\/policy\.json: /,
  );
});

// ── difficulty ───────────────────────────────────────────────────────────────

const DIFFICULTY = {
  levels: [
    { id: "normal", label: "보통" },
    { id: "hard", label: "어려움" },
  ],
  defaultLevelId: "normal",
};

test("difficulty is optional, and parses when present", () => {
  assert.equal(parse().difficulty, undefined);
  const withDifficulty = parse({ ...VALID_INFO, difficulty: DIFFICULTY });
  assert.equal(withDifficulty.difficulty?.defaultLevelId, "normal");
  assert.equal(withDifficulty.difficulty?.levels.length, 2);
});

test("defaultLevelId must name one of the declared levels", () => {
  assertRejects(
    () => parse({ ...VALID_INFO, difficulty: { ...DIFFICULTY, defaultLevelId: "extreme" } }),
    /defaultLevelId "extreme" is not one of normal, hard/,
  );
});

test("duplicate difficulty ids are rejected — each id is a leaderboard partition", () => {
  assertRejects(
    () =>
      parse({
        ...VALID_INFO,
        difficulty: {
          levels: [
            { id: "normal", label: "보통" },
            { id: "normal", label: "또 보통" },
          ],
          defaultLevelId: "normal",
        },
      }),
    /duplicate id "normal"/,
  );
});

test("an empty difficulty level list is rejected", () => {
  assertRejects(
    () => parse({ ...VALID_INFO, difficulty: { levels: [], defaultLevelId: "normal" } }),
    /difficulty\.levels must be a non-empty array/,
  );
});

// ── registry-wide invariants ─────────────────────────────────────────────────

function definitionWithSlug(slug: string): GameDefinition {
  return { ...parse(), slug };
}

test("assertUniqueSlugs rejects a collision — the guarantee no schema provides today", () => {
  assert.doesNotThrow(() => assertUniqueSlugs([definitionWithSlug("a"), definitionWithSlug("b")]));
  assert.throws(
    () => assertUniqueSlugs([definitionWithSlug("a"), definitionWithSlug("a")]),
    /Duplicate game slug "a"/,
  );
});

function manifestFor(definition: GameDefinition): GameManifest {
  return {
    id: definition.slug,
    slug: definition.slug,
    title: definition.title,
    shortDescription: definition.shortDescription,
    description: definition.description,
    modes: definition.modes,
    status: definition.status,
    categories: definition.categories,
    tags: definition.tags,
    minPlayers: definition.minPlayers,
    maxPlayers: definition.maxPlayers,
    thumbnail: definition.thumbnail,
    requiresAuth: definition.policy.requiresAuth,
    supportsLeaderboard: definition.policy.leaderboard,
    inputMethods: definition.inputMethods,
    supportsReplay: definition.supportsReplay,
    version: "0.0.1",
    ...(definition.policy.score ? { scoreConfig: definition.policy.score } : {}),
  };
}

test("the two sources agreeing passes, and any field disagreeing fails", () => {
  const definition = parse();
  assert.doesNotThrow(() =>
    assertDefinitionsMatchManifests([definition], [manifestFor(definition)]),
  );

  const drifted = { ...manifestFor(definition), title: "다른 제목" };
  assert.throws(
    () => assertDefinitionsMatchManifests([definition], [drifted]),
    /title: registry "샘플 게임" vs manifest "다른 제목"/,
  );
});

test("a score policy diverging from the manifest's scoreConfig is caught", () => {
  // The case that matters most: score bounds are what a submission is validated against, so the
  // two sources disagreeing here would mean the catalog and the validator using different rules.
  const definition = parse();
  const drifted = {
    ...manifestFor(definition),
    scoreConfig: {
      unit: "ms",
      direction: "asc" as const,
      min: 1,
      max: 10000,
      displaySuffix: " ms",
    },
  };
  assert.throws(() => assertDefinitionsMatchManifests([definition], [drifted]), /policy\.score/);
});

test("a game present in one source but not the other is caught", () => {
  const definition = parse();
  assert.throws(
    () => assertDefinitionsMatchManifests([definition], []),
    /describe different games/,
  );
});

// ── the real directory ───────────────────────────────────────────────────────

test("the checked-in game-registry/ parses, and holds only SYSTEM games", () => {
  const definitions = loadGameDefinitions(process.cwd());
  assert.ok(definitions.length > 0);
  for (const definition of definitions) {
    assert.equal(definition.owner.type, "SYSTEM");
  }
});

test("loadGameDefinitions returns a deterministic, slug-sorted list", () => {
  const slugs = loadGameDefinitions(process.cwd()).map((d) => d.slug);
  assert.deepEqual(slugs, [...slugs].sort());
});
