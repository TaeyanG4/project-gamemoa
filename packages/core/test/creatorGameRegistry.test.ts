import test from "node:test";
import assert from "node:assert/strict";
import type { SandboxGameRepository, SandboxGameRecord } from "../src/ports/sandboxGames.js";
import type { CreatorGameDefinitionRepository } from "../src/ports/creatorGameDefinition.js";
import type { CreatorGameCanonicalDocument } from "../src/domain/creatorGameCanonicalDocument.js";
import { CREATOR_GAME_DEFINITION_SCHEMA_VERSION } from "../src/domain/creatorGameCanonicalDocument.js";
import {
  CreatorGameRegistry,
  CreatorGameRegistryError,
} from "../src/modules/game/registry/creatorGameRegistry.js";
import { isCreatorGameDefinition } from "../src/modules/game/domain/gameDefinition.js";

/**
 * A minimal fake SandboxGameRepository — CreatorGameRegistry only ever calls `findBySlug` and
 * `listAll`; every other method is stubbed to throw so a test would fail loudly if the registry
 * ever started calling something it shouldn't (a write method, in particular — this registry is
 * read-only).
 */
function fakeSandboxGameRepo(
  rows: readonly SandboxGameRecord[],
): SandboxGameRepository & { findBySlugCalls: string[] } {
  const findBySlugCalls: string[] = [];
  const notImplemented = (name: string) => async () => {
    throw new Error(`fakeSandboxGameRepo.${name} should never be called by CreatorGameRegistry`);
  };
  return {
    findBySlugCalls,
    async findBySlug(slug) {
      findBySlugCalls.push(slug);
      // Mirrors D1SandboxGameRepository.findBySlug's real semantics: deleted rows are excluded.
      return rows.find((r) => r.slug === slug && r.deletedAt === null) ?? null;
    },
    async listAll() {
      // Mirrors the real port: listAll includes deleted rows (CreatorGameRegistry itself must
      // filter them out) and preserves whatever order it's given.
      return [...rows];
    },
    findById: notImplemented("findById"),
    slugExists: notImplemented("slugExists"),
    listByDeveloper: notImplemented("listByDeveloper"),
    listPublic: notImplemented("listPublic"),
    create: notImplemented("create"),
    releaseReviewSlot: notImplemented("releaseReviewSlot"),
    setLogo: notImplemented("setLogo"),
    softDelete: notImplemented("softDelete"),
    hardDelete: notImplemented("hardDelete"),
    updateMetadata: notImplemented("updateMetadata"),
    setVisibility: notImplemented("setVisibility"),
    setLiveVersion: notImplemented("setLiveVersion"),
    createVersion: notImplemented("createVersion"),
    findVersionById: notImplemented("findVersionById"),
    listVersionsByGame: notImplemented("listVersionsByGame"),
    setVersionPublishState: notImplemented("setVersionPublishState"),
    listPendingVersions: notImplemented("listPendingVersions"),
    decideVersion: notImplemented("decideVersion"),
    revokeVersionApproval: notImplemented("revokeVersionApproval"),
    clearLiveVersionIfMatches: notImplemented("clearLiveVersionIfMatches"),
    withdrawVersion: notImplemented("withdrawVersion"),
    appendReviewAudit: notImplemented("appendReviewAudit"),
    listReviewAudit: notImplemented("listReviewAudit"),
    isSlugPermanentlyReserved: notImplemented("isSlugPermanentlyReserved"),
  };
}

function fakeCanonicalRepo(
  documents: Record<string, CreatorGameCanonicalDocument>,
): CreatorGameDefinitionRepository & { findBySlugCalls: string[] } {
  const findBySlugCalls: string[] = [];
  return {
    findBySlugCalls,
    async findBySlug(slug) {
      findBySlugCalls.push(slug);
      return documents[slug] ?? null;
    },
    async save() {
      throw new Error("fakeCanonicalRepo.save should never be called by CreatorGameRegistry");
    },
    async delete() {
      throw new Error("fakeCanonicalRepo.delete should never be called by CreatorGameRegistry");
    },
  };
}

function sandboxRow(overrides: Partial<SandboxGameRecord> = {}): SandboxGameRecord {
  return {
    id: 1,
    slug: "my-creator-game",
    developerUserId: 42,
    title: "D1's own (stale/duplicate) title",
    shortDescription: "D1's own (stale/duplicate) shortDescription",
    description: "D1's own (stale/duplicate) description",
    genre: "D1's own (stale/duplicate) genre",
    mode: "multi", // deliberately different from the canonical fixture's "single", below
    logoKey: null,
    xpPerCompletion: 10,
    scoreUnit: "pts",
    scoreDirection: "desc",
    scoreMin: 0,
    scoreMax: 100,
    scoreDisplayPrefix: null,
    scoreDisplaySuffix: null,
    visibility: "PUBLIC",
    liveVersionId: 5,
    reviewSlot: null,
    deletedAt: null,
    deletedByAdminId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function canonicalDoc(
  overrides: Partial<CreatorGameCanonicalDocument> = {},
): CreatorGameCanonicalDocument {
  return {
    schemaVersion: CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
    slug: "my-creator-game",
    title: "Canonical Title",
    shortDescription: "Canonical short description",
    description: "Canonical description",
    genre: "puzzle",
    mode: "single",
    policy: {
      score: { unit: "pts", direction: "desc", min: 0, max: 100 },
      leaderboard: true,
      xpPerCompletion: 25,
      requiresAuth: false,
    },
    updatedAt: "2026-01-03T00:00:00.000Z",
    ...overrides,
  };
}

// ── findBySlug ────────────────────────────────────────────────────────────────

test("findBySlug: unknown D1 row -> null, and the B2 canonical lookup is never even attempted", async () => {
  const sandboxRepo = fakeSandboxGameRepo([]);
  const canonicalRepo = fakeCanonicalRepo({});
  const registry = new CreatorGameRegistry(sandboxRepo, canonicalRepo);

  const result = await registry.findBySlug("nonexistent-slug");

  assert.equal(result, null);
  assert.deepEqual(canonicalRepo.findBySlugCalls, []);
});

test("findBySlug: a normal Creator game uses B2 canonical metadata/policy, not D1's duplicate columns", async () => {
  const row = sandboxRow();
  const doc = canonicalDoc();
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([row]),
    fakeCanonicalRepo({ [row.slug]: doc }),
  );

  const result = await registry.findBySlug(row.slug);

  assert.ok(result);
  assert.ok(isCreatorGameDefinition(result));
  if (isCreatorGameDefinition(result)) {
    assert.equal(result.title, doc.title);
    assert.equal(result.shortDescription, doc.shortDescription);
    assert.equal(result.description, doc.description);
    assert.deepEqual(result.policy, doc.policy);
  }
});

test("findBySlug: owner.userId comes from D1's developerUserId", async () => {
  const row = sandboxRow({ developerUserId: 999 });
  const doc = canonicalDoc();
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([row]),
    fakeCanonicalRepo({ [row.slug]: doc }),
  );

  const result = await registry.findBySlug(row.slug);
  assert.deepEqual(result?.owner, { type: "CREATOR", userId: 999 });
});

test("findBySlug: status draft when liveVersionId is null", async () => {
  const row = sandboxRow({ liveVersionId: null, visibility: "PRIVATE" });
  const doc = canonicalDoc();
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([row]),
    fakeCanonicalRepo({ [row.slug]: doc }),
  );
  const result = await registry.findBySlug(row.slug);
  assert.equal(result?.status, "draft");
});

test("findBySlug: status hidden when live + visibility PRIVATE", async () => {
  const row = sandboxRow({ liveVersionId: 5, visibility: "PRIVATE" });
  const doc = canonicalDoc();
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([row]),
    fakeCanonicalRepo({ [row.slug]: doc }),
  );
  const result = await registry.findBySlug(row.slug);
  assert.equal(result?.status, "hidden");
});

test("findBySlug: status published when live + visibility PUBLIC", async () => {
  const row = sandboxRow({ liveVersionId: 5, visibility: "PUBLIC" });
  const doc = canonicalDoc();
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([row]),
    fakeCanonicalRepo({ [row.slug]: doc }),
  );
  const result = await registry.findBySlug(row.slug);
  assert.equal(result?.status, "published");
});

test("findBySlug: presentation passes through from the canonical document verbatim", async () => {
  const presentation = {
    viewport: { mode: "fixed" as const, preferredWidth: 640, preferredHeight: 360 },
    fullscreen: { supported: true, recommended: false },
    mobile: { support: "unsupported" as const },
  };
  const row = sandboxRow();
  const doc = canonicalDoc({ presentation });
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([row]),
    fakeCanonicalRepo({ [row.slug]: doc }),
  );
  const result = await registry.findBySlug(row.slug);
  assert.deepEqual(result?.presentation, presentation);
});

test("findBySlug: presentation is undefined when the canonical document has none", async () => {
  const row = sandboxRow();
  const doc = canonicalDoc({ presentation: undefined });
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([row]),
    fakeCanonicalRepo({ [row.slug]: doc }),
  );
  const result = await registry.findBySlug(row.slug);
  assert.equal(result?.presentation, undefined);
});

test("findBySlug: hasLogo true when D1's logoKey is set", async () => {
  const row = sandboxRow({ logoKey: "creator-uploads/42/logo.png" });
  const doc = canonicalDoc();
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([row]),
    fakeCanonicalRepo({ [row.slug]: doc }),
  );
  const result = await registry.findBySlug(row.slug);
  assert.ok(result && isCreatorGameDefinition(result) && result.hasLogo === true);
});

test("findBySlug: hasLogo false when D1's logoKey is null", async () => {
  const row = sandboxRow({ logoKey: null });
  const doc = canonicalDoc();
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([row]),
    fakeCanonicalRepo({ [row.slug]: doc }),
  );
  const result = await registry.findBySlug(row.slug);
  assert.ok(result && isCreatorGameDefinition(result) && result.hasLogo === false);
});

test("findBySlug: supportsReplay is always false for a Creator game", async () => {
  const row = sandboxRow();
  const doc = canonicalDoc();
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([row]),
    fakeCanonicalRepo({ [row.slug]: doc }),
  );
  const result = await registry.findBySlug(row.slug);
  assert.equal(result?.supportsReplay, false);
});

test("findBySlug: difficulty is always undefined for a Creator game — no invented default", async () => {
  const row = sandboxRow();
  const doc = canonicalDoc();
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([row]),
    fakeCanonicalRepo({ [row.slug]: doc }),
  );
  const result = await registry.findBySlug(row.slug);
  assert.equal(result?.difficulty, undefined);
});

test("findBySlug: when B2 canonical disagrees with D1's own duplicate columns, B2 wins — genre and mode come from canonical, never from D1", async () => {
  // sandboxRow() and canonicalDoc() are deliberately built with different title/genre/mode above —
  // this test just names that property explicitly.
  const row = sandboxRow({ genre: "d1-genre", mode: "multi", title: "D1 Title" });
  const doc = canonicalDoc({ genre: "canonical-genre", mode: "single", title: "Canonical Title" });
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([row]),
    fakeCanonicalRepo({ [row.slug]: doc }),
  );

  const result = await registry.findBySlug(row.slug);
  assert.ok(result && isCreatorGameDefinition(result));
  if (result && isCreatorGameDefinition(result)) {
    assert.equal(result.genre, "canonical-genre");
    assert.equal(result.mode, "single");
    assert.equal(result.title, "Canonical Title");
  }
});

// ── fail-closed ───────────────────────────────────────────────────────────────

test("findBySlug: fail closed — D1 row exists but B2 canonical is missing (inconsistent state, not 'unknown game')", async () => {
  const row = sandboxRow();
  const registry = new CreatorGameRegistry(fakeSandboxGameRepo([row]), fakeCanonicalRepo({}));

  await assert.rejects(registry.findBySlug(row.slug), (err) => {
    assert.ok(err instanceof CreatorGameRegistryError);
    assert.equal(err.reason, "CANONICAL_MISSING");
    assert.equal(err.slug, row.slug);
    return true;
  });
});

test("findBySlug: fail closed — a malformed canonical document / storage failure propagates untouched, never swallowed or wrapped", async () => {
  const row = sandboxRow();
  const sentinel = new Error("simulated malformed canonical document / storage failure");
  const canonicalRepo: CreatorGameDefinitionRepository = {
    findBySlug: async () => {
      throw sentinel;
    },
    save: async () => {
      throw new Error("unused");
    },
    delete: async () => {
      throw new Error("unused");
    },
  };
  const registry = new CreatorGameRegistry(fakeSandboxGameRepo([row]), canonicalRepo);

  await assert.rejects(registry.findBySlug(row.slug), (err) => err === sentinel);
});

test("findBySlug: a soft-deleted row resolves null — the same 'not found' as an unknown slug", async () => {
  const row = sandboxRow({ deletedAt: "2026-01-05T00:00:00.000Z" });
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([row]),
    fakeCanonicalRepo({ [row.slug]: canonicalDoc() }),
  );

  const result = await registry.findBySlug(row.slug);
  assert.equal(result, null);
});

// ── pre-canonical Creator rows (not yet canonicalizable — normal, not corruption) ──
//
// A freshly-created Creator game has every score_* column null until an admin configures one
// (SandboxGameUseCases.createGame's own contract) — Stage B-1's mapper already refuses to
// canonicalize that state (SCORE_POLICY_NOT_CONFIGURED), so a D1 row in this state having no B2
// document is expected, ongoing lifecycle, not a registry inconsistency.

function preCanonicalRow(overrides: Partial<SandboxGameRecord> = {}): SandboxGameRecord {
  return sandboxRow({
    scoreUnit: null,
    scoreDirection: null,
    scoreMin: null,
    scoreMax: null,
    ...overrides,
  });
}

test("findBySlug: a fresh row (every score_* column null) with no B2 document resolves null — not CANONICAL_MISSING", async () => {
  const row = preCanonicalRow();
  const registry = new CreatorGameRegistry(fakeSandboxGameRepo([row]), fakeCanonicalRepo({}));

  const result = await registry.findBySlug(row.slug);
  assert.equal(result, null);
});

test("findBySlug: a partially-configured score policy (some but not all score_* columns set) with no B2 document is still pre-canonical -> null, matching Stage B-1's own incomplete-policy semantics", async () => {
  const row = preCanonicalRow({ scoreUnit: "pts", scoreDirection: "desc" }); // min/max still null
  const registry = new CreatorGameRegistry(fakeSandboxGameRepo([row]), fakeCanonicalRepo({}));

  const result = await registry.findBySlug(row.slug);
  assert.equal(result, null);
});

test("findBySlug: pre-canonical resolution never falls back to D1's own title/description/genre to synthesize a definition", async () => {
  const row = preCanonicalRow({ title: "D1's own title", genre: "d1-genre" });
  const registry = new CreatorGameRegistry(fakeSandboxGameRepo([row]), fakeCanonicalRepo({}));

  // The only possible non-error outcome is a strict null — there is no partial/synthesized
  // GameDefinition built from D1 alone for this case.
  const result = await registry.findBySlug(row.slug);
  assert.equal(result, null);
});

test("findBySlug: a fully-configured score policy with no B2 document IS CANONICAL_MISSING — canonicalization was possible but never happened", async () => {
  const row = sandboxRow(); // fixture default: fully-configured score policy
  const registry = new CreatorGameRegistry(fakeSandboxGameRepo([row]), fakeCanonicalRepo({}));

  await assert.rejects(registry.findBySlug(row.slug), (err) => {
    assert.ok(err instanceof CreatorGameRegistryError);
    assert.equal(err.reason, "CANONICAL_MISSING");
    return true;
  });
});

test("findBySlug: a B2 canonical document is used even when D1's own score policy currently looks incomplete — B2 is the source of truth regardless of D1 readiness", async () => {
  const row = preCanonicalRow();
  const doc = canonicalDoc();
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([row]),
    fakeCanonicalRepo({ [row.slug]: doc }),
  );

  const result = await registry.findBySlug(row.slug);
  assert.ok(result && isCreatorGameDefinition(result));
  if (result && isCreatorGameDefinition(result)) {
    assert.equal(result.title, doc.title);
    assert.deepEqual(result.policy, doc.policy);
  }
});

test("findBySlug: a storage failure while reading B2 propagates even for a pre-canonical row — never silently resolved to null", async () => {
  const row = preCanonicalRow();
  const sentinel = new Error("simulated storage failure");
  const canonicalRepo: CreatorGameDefinitionRepository = {
    findBySlug: async () => {
      throw sentinel;
    },
    save: async () => {
      throw new Error("unused");
    },
    delete: async () => {
      throw new Error("unused");
    },
  };
  const registry = new CreatorGameRegistry(fakeSandboxGameRepo([row]), canonicalRepo);

  await assert.rejects(registry.findBySlug(row.slug), (err) => err === sentinel);
});

// ── listAll ───────────────────────────────────────────────────────────────────

test("listAll: enumerates through SandboxGameRepository.listAll(), not any B2 prefix listing", async () => {
  const rowA = sandboxRow({ slug: "game-a", id: 1 });
  const rowB = sandboxRow({ slug: "game-b", id: 2 });
  const docs = {
    "game-a": canonicalDoc({ slug: "game-a" }),
    "game-b": canonicalDoc({ slug: "game-b" }),
  };
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([rowA, rowB]),
    fakeCanonicalRepo(docs),
  );

  const result = await registry.listAll();
  assert.equal(result.length, 2);
});

test("listAll: excludes soft-deleted rows", async () => {
  const alive = sandboxRow({ slug: "alive-game", id: 1, deletedAt: null });
  const deleted = sandboxRow({
    slug: "deleted-game",
    id: 2,
    deletedAt: "2026-01-05T00:00:00.000Z",
  });
  const docs = {
    "alive-game": canonicalDoc({ slug: "alive-game" }),
    "deleted-game": canonicalDoc({ slug: "deleted-game" }),
  };
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([alive, deleted]),
    fakeCanonicalRepo(docs),
  );

  const result = await registry.listAll();
  assert.deepEqual(
    result.map((d) => d.slug),
    ["alive-game"],
  );
});

test("listAll: preserves SandboxGameRepository.listAll()'s own order — never re-sorted", async () => {
  const rowC = sandboxRow({ slug: "zzz-game", id: 1 });
  const rowA = sandboxRow({ slug: "aaa-game", id: 2 });
  const rowB = sandboxRow({ slug: "mmm-game", id: 3 });
  // Deliberately NOT alphabetical — proves listAll doesn't sort by slug or anything else.
  const orderedRows = [rowC, rowA, rowB];
  const docs = Object.fromEntries(orderedRows.map((r) => [r.slug, canonicalDoc({ slug: r.slug })]));
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo(orderedRows),
    fakeCanonicalRepo(docs),
  );

  const result = await registry.listAll();
  assert.deepEqual(
    result.map((d) => d.slug),
    ["zzz-game", "aaa-game", "mmm-game"],
  );
});

test("listAll: every row gets its canonical document projected", async () => {
  const rowA = sandboxRow({ slug: "game-a", id: 1, genre: "d1-genre" });
  const rowB = sandboxRow({ slug: "game-b", id: 2 });
  const docs = {
    "game-a": canonicalDoc({ slug: "game-a", genre: "canonical-genre-a" }),
    "game-b": canonicalDoc({ slug: "game-b", genre: "canonical-genre-b" }),
  };
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([rowA, rowB]),
    fakeCanonicalRepo(docs),
  );

  const result = await registry.listAll();
  const genres = result.filter(isCreatorGameDefinition).map((d) => d.genre);
  assert.deepEqual(genres, ["canonical-genre-a", "canonical-genre-b"]);
});

test("listAll: one row's missing canonical document fails the whole call — no silent skip, no partial registry", async () => {
  const rowA = sandboxRow({ slug: "game-a", id: 1 });
  const rowB = sandboxRow({ slug: "game-b", id: 2 }); // no canonical document registered for this one
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([rowA, rowB]),
    fakeCanonicalRepo({ "game-a": canonicalDoc({ slug: "game-a" }) }),
  );

  await assert.rejects(registry.listAll(), (err) => {
    assert.ok(err instanceof CreatorGameRegistryError);
    assert.equal(err.reason, "CANONICAL_MISSING");
    assert.equal(err.slug, "game-b");
    return true;
  });
});

test("listAll: one row's storage/malformed-document failure fails the whole call, propagated untouched", async () => {
  const rowA = sandboxRow({ slug: "game-a", id: 1 });
  const rowB = sandboxRow({ slug: "game-b", id: 2 });
  const sentinel = new Error("simulated storage failure on game-b");
  const canonicalRepo: CreatorGameDefinitionRepository = {
    async findBySlug(slug) {
      if (slug === "game-a") return canonicalDoc({ slug: "game-a" });
      throw sentinel;
    },
    save: async () => {
      throw new Error("unused");
    },
    delete: async () => {
      throw new Error("unused");
    },
  };
  const registry = new CreatorGameRegistry(fakeSandboxGameRepo([rowA, rowB]), canonicalRepo);

  await assert.rejects(registry.listAll(), (err) => err === sentinel);
});

test("listAll: a pre-canonical row is silently skipped while a normal canonical game is still returned", async () => {
  const canonicalGame = sandboxRow({ slug: "canonical-game", id: 1 });
  const draftGame = preCanonicalRow({ slug: "draft-game", id: 2 });
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([canonicalGame, draftGame]),
    fakeCanonicalRepo({ "canonical-game": canonicalDoc({ slug: "canonical-game" }) }),
  );

  const result = await registry.listAll();
  assert.deepEqual(
    result.map((d) => d.slug),
    ["canonical-game"],
  );
});

test("listAll: a canonical-ready row with no B2 document still fails the whole call, even alongside other pre-canonical rows", async () => {
  const draftGame = preCanonicalRow({ slug: "draft-game", id: 1 });
  const inconsistentGame = sandboxRow({ slug: "inconsistent-game", id: 2 }); // fully configured, no B2 doc
  const registry = new CreatorGameRegistry(
    fakeSandboxGameRepo([draftGame, inconsistentGame]),
    fakeCanonicalRepo({}),
  );

  await assert.rejects(registry.listAll(), (err) => {
    assert.ok(err instanceof CreatorGameRegistryError);
    assert.equal(err.reason, "CANONICAL_MISSING");
    assert.equal(err.slug, "inconsistent-game");
    return true;
  });
});
