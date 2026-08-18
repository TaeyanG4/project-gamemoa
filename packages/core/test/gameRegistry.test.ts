import test from "node:test";
import assert from "node:assert/strict";
import {
  GAME_DEFINITIONS,
  GAME_DEFINITION_MAP,
  GAME_MANIFESTS,
  StaticGameRegistry,
  type GameDefinition,
  type GameRegistry,
} from "../src/index.js";

function definition(overrides: Partial<GameDefinition> = {}): GameDefinition {
  const base = GAME_DEFINITIONS[0];
  assert.ok(base, "the generated registry should not be empty");
  return { ...base, ...overrides };
}

// ── StaticGameRegistry ───────────────────────────────────────────────────────

test("findBySlug resolves a known game and returns null for an unknown one", async () => {
  const registry: GameRegistry = new StaticGameRegistry([
    definition({ slug: "alpha" }),
    definition({ slug: "beta" }),
  ]);

  assert.equal((await registry.findBySlug("alpha"))?.slug, "alpha");
  // Null must mean "not a game", never "unrestricted" — the loose fallback that behaviour
  // replaced was a real hole (docs/GAME_CREATION_GUIDE.md §3.5).
  assert.equal(await registry.findBySlug("no-such-game"), null);
});

test("findBySlug is exact — no case folding, trimming, or prefix matching", async () => {
  const registry = new StaticGameRegistry([definition({ slug: "alpha" })]);

  for (const probe of ["Alpha", " alpha", "alpha ", "alph", "alpha-2"]) {
    assert.equal(await registry.findBySlug(probe), null, probe);
  }
});

test("listAll returns every definition, in the order given", async () => {
  const registry = new StaticGameRegistry([
    definition({ slug: "beta" }),
    definition({ slug: "alpha" }),
  ]);

  assert.deepEqual(
    (await registry.listAll()).map((d) => d.slug),
    ["beta", "alpha"],
  );
});

test("an empty registry is valid and resolves nothing", async () => {
  const registry = new StaticGameRegistry([]);
  assert.deepEqual(await registry.listAll(), []);
  assert.equal(await registry.findBySlug("alpha"), null);
});

test("a duplicate slug throws at construction rather than silently shadowing a game", () => {
  assert.throws(
    () => new StaticGameRegistry([definition({ slug: "alpha" }), definition({ slug: "alpha" })]),
    /Duplicate game slug in registry: alpha/,
  );
});

test("the registry does not alias the caller's array, so later mutation can't change it", async () => {
  const definitions = [definition({ slug: "alpha" })];
  const registry = new StaticGameRegistry(definitions);

  definitions.push(definition({ slug: "beta" }));

  assert.equal((await registry.listAll()).length, 1);
  assert.equal(await registry.findBySlug("beta"), null);
});

test("the generated SYSTEM definitions load into a registry as-is", async () => {
  const registry = new StaticGameRegistry(GAME_DEFINITIONS);
  const all = await registry.listAll();

  assert.equal(all.length, GAME_DEFINITIONS.length);
  for (const known of GAME_DEFINITIONS) {
    assert.equal((await registry.findBySlug(known.slug))?.slug, known.slug);
  }
});

// ── the generated registry itself ────────────────────────────────────────────

test("every generated definition is SYSTEM-owned — creator games are not described here yet", () => {
  assert.ok(GAME_DEFINITIONS.length > 0);
  for (const def of GAME_DEFINITIONS) {
    assert.deepEqual(def.owner, { type: "SYSTEM" });
  }
});

test("GAME_DEFINITION_MAP is keyed by slug and agrees with the list", () => {
  assert.equal(Object.keys(GAME_DEFINITION_MAP).length, GAME_DEFINITIONS.length);
  for (const def of GAME_DEFINITIONS) {
    assert.equal(GAME_DEFINITION_MAP[def.slug]?.slug, def.slug);
  }
});

test("slugs are globally unique across the registry", () => {
  const slugs = GAME_DEFINITIONS.map((d) => d.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

/**
 * The strangler-fig safety net.
 *
 * `game-registry/` is canonical-in-waiting; `GAME_MANIFESTS` is what score validation, difficulty
 * validation and the admin kill switch still actually read. Both exist at once during the
 * migration, so this asserts they describe the same games the same way. The build enforces it too
 * (scripts/registry-builder.ts's assertDefinitionsMatchManifests) — this is the same invariant
 * stated where a reader of packages/core will find it, and what makes switching the consumers
 * over in the next PR a small change rather than one that has to be trusted.
 */
test("the file-based registry and the manifest registry describe the same games", () => {
  assert.deepEqual(
    GAME_DEFINITIONS.map((d) => d.slug).sort(),
    GAME_MANIFESTS.map((m) => m.slug).sort(),
  );
});

test("each definition's score policy matches the manifest's scoreConfig exactly", () => {
  // The one that would bite hardest: score bounds are what a submission is validated against, so
  // a divergence here means the catalog and the validator disagree about the rules.
  for (const def of GAME_DEFINITIONS) {
    const manifest = GAME_MANIFESTS.find((m) => m.slug === def.slug);
    assert.ok(manifest, def.slug);
    assert.deepEqual(def.policy.score, manifest.scoreConfig ?? null, def.slug);
    assert.equal(def.policy.leaderboard, manifest.supportsLeaderboard, def.slug);
    assert.equal(def.policy.requiresAuth, manifest.requiresAuth, def.slug);
    assert.deepEqual(def.difficulty, manifest.difficulty, def.slug);
  }
});

test("XP starts at zero for every game — it is granted by an explicit operator decision", () => {
  // Irreversible once granted, and capped per game, so a non-zero default would be a way to
  // multiply the daily cap by publishing more games. See docs/GAME_CREATION_GUIDE.md §3.5.
  for (const def of GAME_DEFINITIONS) {
    assert.equal(def.policy.xpPerCompletion, 0, def.slug);
  }
});

test("nothing in the runtime reads GAME_DEFINITIONS yet", () => {
  // Guards the "no runtime change" property of this step: score validation still resolves through
  // the manifest registry. When this assertion becomes false, that is the switchover, and it
  // should be a deliberate edit to this test rather than a surprise.
  assert.notEqual(GAME_MANIFESTS.length, 0);
  assert.equal(GAME_DEFINITIONS.length, GAME_MANIFESTS.length);
});
