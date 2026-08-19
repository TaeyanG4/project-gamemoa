import test from "node:test";
import assert from "node:assert/strict";
import { CompositeGameRegistry } from "../src/modules/game/registry/compositeGameRegistry.js";
import type { GameRegistry } from "../src/modules/game/ports/gameRegistry.js";
import type { GameDefinition } from "../src/modules/game/domain/gameDefinition.js";
import { CreatorGameRegistryError } from "../src/modules/game/registry/creatorGameRegistry.js";

function systemDef(slug: string, overrides: Partial<GameDefinition> = {}): GameDefinition {
  return {
    slug,
    owner: { type: "SYSTEM" },
    title: `System ${slug}`,
    shortDescription: "short",
    description: "long",
    status: "published",
    categories: [],
    tags: [],
    modes: ["single"],
    inputMethods: ["mouse"],
    minPlayers: 1,
    maxPlayers: 1,
    thumbnail: "/thumb.svg",
    supportsReplay: false,
    policy: { score: null, leaderboard: false, xpPerCompletion: 0, requiresAuth: false },
    ...overrides,
  } as GameDefinition;
}

function creatorDef(slug: string, overrides: Partial<GameDefinition> = {}): GameDefinition {
  return {
    slug,
    owner: { type: "CREATOR", userId: 1 },
    title: `Creator ${slug}`,
    shortDescription: "short",
    description: "long",
    status: "published",
    supportsReplay: false,
    policy: { score: null, leaderboard: false, xpPerCompletion: 0, requiresAuth: false },
    genre: "puzzle",
    mode: "single",
    hasLogo: false,
    ...overrides,
  } as GameDefinition;
}

/** A fake GameRegistry that records every findBySlug call — used to prove SYSTEM hits never
 * reach the CREATOR registry at all. */
function fakeRegistry(
  definitions: readonly GameDefinition[],
  options: { throwOnFindFor?: string; throwOnListAll?: Error } = {},
): GameRegistry & { findBySlugCalls: string[]; listAllCalls: number } {
  const bySlug = new Map(definitions.map((d) => [d.slug, d]));
  const findBySlugCalls: string[] = [];
  return {
    findBySlugCalls,
    listAllCalls: 0,
    async findBySlug(slug) {
      findBySlugCalls.push(slug);
      if (options.throwOnFindFor === slug) {
        throw new CreatorGameRegistryError("CANONICAL_MISSING", slug);
      }
      return bySlug.get(slug) ?? null;
    },
    async listAll() {
      this.listAllCalls++;
      if (options.throwOnListAll) {
        throw options.throwOnListAll;
      }
      return definitions;
    },
  };
}

// ── findBySlug ────────────────────────────────────────────────────────────────

test("findBySlug: a SYSTEM hit returns the SYSTEM definition", async () => {
  const system = fakeRegistry([systemDef("reaction-time")]);
  const creator = fakeRegistry([]);
  const registry = new CompositeGameRegistry(system, creator);

  const result = await registry.findBySlug("reaction-time");
  assert.equal(result?.owner.type, "SYSTEM");
});

test("findBySlug: a SYSTEM hit never calls the CREATOR registry at all", async () => {
  const system = fakeRegistry([systemDef("reaction-time")]);
  const creator = fakeRegistry([]);
  const registry = new CompositeGameRegistry(system, creator);

  await registry.findBySlug("reaction-time");
  assert.deepEqual(creator.findBySlugCalls, []);
});

test("findBySlug: a SYSTEM miss falls through to the CREATOR registry", async () => {
  const system = fakeRegistry([]);
  const creator = fakeRegistry([creatorDef("my-creator-game")]);
  const registry = new CompositeGameRegistry(system, creator);

  const result = await registry.findBySlug("my-creator-game");
  assert.equal(result?.owner.type, "CREATOR");
  assert.deepEqual(creator.findBySlugCalls, ["my-creator-game"]);
});

test("findBySlug: both miss -> null", async () => {
  const system = fakeRegistry([]);
  const creator = fakeRegistry([]);
  const registry = new CompositeGameRegistry(system, creator);

  const result = await registry.findBySlug("nonexistent");
  assert.equal(result, null);
});

test("findBySlug: a CREATOR storage/malformed-document failure propagates untouched, never swallowed", async () => {
  const sentinel = new Error("simulated storage failure");
  const system = fakeRegistry([]);
  const creator: GameRegistry = {
    findBySlug: async () => {
      throw sentinel;
    },
    listAll: async () => [],
  };
  const registry = new CompositeGameRegistry(system, creator);

  await assert.rejects(registry.findBySlug("some-slug"), (err) => err === sentinel);
});

test("findBySlug: a CREATOR CANONICAL_MISSING error propagates untouched", async () => {
  const system = fakeRegistry([]);
  const creator = fakeRegistry([], { throwOnFindFor: "inconsistent-slug" });
  const registry = new CompositeGameRegistry(system, creator);

  await assert.rejects(registry.findBySlug("inconsistent-slug"), (err) => {
    assert.ok(err instanceof CreatorGameRegistryError);
    assert.equal(err.reason, "CANONICAL_MISSING");
    return true;
  });
});

// ── listAll ───────────────────────────────────────────────────────────────────

test("listAll: SYSTEM definitions first, then CREATOR, each source's own order preserved", async () => {
  const system = fakeRegistry([systemDef("zzz-system"), systemDef("aaa-system")]);
  const creator = fakeRegistry([creatorDef("mmm-creator"), creatorDef("bbb-creator")]);
  const registry = new CompositeGameRegistry(system, creator);

  const result = await registry.listAll();
  assert.deepEqual(
    result.map((d) => d.slug),
    ["zzz-system", "aaa-system", "mmm-creator", "bbb-creator"],
  );
});

test("listAll: a same-slug collision keeps only the SYSTEM definition — no duplicate slug in the result", async () => {
  const system = fakeRegistry([systemDef("reaction-time")]);
  const creator = fakeRegistry([creatorDef("reaction-time"), creatorDef("other-creator-game")]);
  const registry = new CompositeGameRegistry(system, creator);

  const result = await registry.listAll();
  assert.deepEqual(
    result.map((d) => d.slug),
    ["reaction-time", "other-creator-game"],
  );
  assert.equal(result.find((d) => d.slug === "reaction-time")?.owner.type, "SYSTEM");
});

test("listAll: a CREATOR failure fails the whole call — never a partial SYSTEM-only result", async () => {
  const sentinel = new Error("simulated creator registry failure");
  const system = fakeRegistry([systemDef("reaction-time")]);
  const creator: GameRegistry = {
    findBySlug: async () => null,
    listAll: async () => {
      throw sentinel;
    },
  };
  const registry = new CompositeGameRegistry(system, creator);

  await assert.rejects(registry.listAll(), (err) => err === sentinel);
});

test("listAll: the combined result is never re-sorted alphabetically", async () => {
  const system = fakeRegistry([systemDef("memory-test"), systemDef("aim-test")]);
  const creator = fakeRegistry([creatorDef("zzz-creator")]);
  const registry = new CompositeGameRegistry(system, creator);

  const result = await registry.listAll();
  assert.deepEqual(
    result.map((d) => d.slug),
    ["memory-test", "aim-test", "zzz-creator"],
  );
});
