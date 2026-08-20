import test from "node:test";
import assert from "node:assert/strict";
import type { CreatorGameDefinitionRepository } from "../src/ports/creatorGameDefinition.js";
import type { CreatorGameCanonicalDocument } from "../src/domain/creatorGameCanonicalDocument.js";
import { CREATOR_GAME_DEFINITION_SCHEMA_VERSION } from "../src/domain/creatorGameCanonicalDocument.js";
import type { GameCanonicalRepository } from "../src/modules/game/ports/gameCanonicalRepository.js";
import type { GameCanonicalDocument } from "../src/modules/game/domain/gameCanonicalDocument.js";
import { creatorCanonicalDocumentToGameCanonicalDocument } from "../src/modules/game/domain/gameCanonicalMigration.js";
import {
  classifyGenericCanonicalMigrationRow,
  classifyGenericCanonicalMigrationRows,
  applyGenericCanonicalMigration,
} from "../src/application/genericCanonicalMigration.js";

/**
 * Fake, in-memory ports — no B2, no network. `throwOnFindFor` on either repo simulates the real
 * failure mode a B2 adapter can propagate (a malformed/unreadable stored document, or a raw
 * storage failure), matching creatorCanonicalBackfill.test.ts's own fake-repo pattern.
 */
function createFakeSource(): CreatorGameDefinitionRepository & {
  documents: Map<string, CreatorGameCanonicalDocument>;
  throwOnFindFor?: string;
} {
  return {
    documents: new Map(),
    async findBySlug(slug) {
      if (this.throwOnFindFor === slug) {
        throw new Error(`simulated malformed/unreadable Creator document at ${slug}`);
      }
      return this.documents.get(slug) ?? null;
    },
    async save(document) {
      this.documents.set(document.slug, document);
    },
    async delete(slug) {
      this.documents.delete(slug);
    },
  };
}

function createFakeDestination(): GameCanonicalRepository & {
  documents: Map<string, GameCanonicalDocument>;
  throwOnFindFor?: string;
  throwOnSaveFor?: string;
} {
  return {
    documents: new Map(),
    async findBySlug(slug) {
      if (this.throwOnFindFor === slug) {
        throw new Error(`simulated malformed/unreadable generic document at ${slug}`);
      }
      return this.documents.get(slug) ?? null;
    },
    async save(document) {
      if (this.throwOnSaveFor === document.slug) {
        throw new Error(`simulated storage failure saving ${document.slug}`);
      }
      this.documents.set(document.slug, document);
    },
    async delete(slug) {
      this.documents.delete(slug);
    },
  };
}

/** A GENRE_MODE Creator source shaped like production's ball-dodge: seconds score, description,
 * requiresAuth=false, leaderboard=true, decimal-safe bounds — per this Stage's own task
 * description ("test fixture로는 ball-dodge와 유사한 케이스 사용 가능"). No real production B2
 * object is ever touched by this file. */
function ballDodgeLikeSource(
  overrides: Partial<CreatorGameCanonicalDocument> = {},
): CreatorGameCanonicalDocument {
  return {
    schemaVersion: CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
    slug: "ball-dodge-like",
    title: "Ball Dodge",
    shortDescription: "Dodge the balls as long as you can",
    description: "Survive as long as possible while dodging incoming balls.",
    genre: "arcade",
    mode: "single",
    policy: {
      score: { unit: "s", direction: "desc", min: 0, max: 999.99 },
      leaderboard: true,
      xpPerCompletion: 15,
      requiresAuth: false,
    },
    updatedAt: "2026-08-20T00:00:00.000Z",
    ...overrides,
  };
}

function expectedGeneric(source: CreatorGameCanonicalDocument): GameCanonicalDocument {
  return creatorCanonicalDocumentToGameCanonicalDocument(source);
}

// ── classification ───────────────────────────────────────────────────────────

test("SOURCE_MISSING: no Creator canonical document exists at this slug", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();

  const status = await classifyGenericCanonicalMigrationRow("nowhere", source, destination);
  assert.equal(status.kind, "SOURCE_MISSING");
});

test("MISSING: a valid Creator source with nothing yet at the generic destination", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);

  const status = await classifyGenericCanonicalMigrationRow(doc.slug, source, destination);
  assert.equal(status.kind, "MISSING");
  if (status.kind === "MISSING") {
    assert.deepEqual(status.document, expectedGeneric(doc));
  }
});

test("MATCH: destination already holds exactly what the source converts to", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);
  destination.documents.set(doc.slug, expectedGeneric(doc));

  const status = await classifyGenericCanonicalMigrationRow(doc.slug, source, destination);
  assert.equal(status.kind, "MATCH");
});

test("CONFLICT: destination exists but disagrees with what the source converts to today", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);
  destination.documents.set(
    doc.slug,
    expectedGeneric(ballDodgeLikeSource({ title: "Stale Title" })),
  );

  const status = await classifyGenericCanonicalMigrationRow(doc.slug, source, destination);
  assert.equal(status.kind, "CONFLICT");
});

test("BLOCKED: converted document has score.min >= score.max", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();
  const doc = ballDodgeLikeSource({
    policy: {
      score: { unit: "pts", direction: "desc", min: 100, max: 100 },
      leaderboard: true,
      xpPerCompletion: 0,
      requiresAuth: false,
    },
  });
  source.documents.set(doc.slug, doc);

  const status = await classifyGenericCanonicalMigrationRow(doc.slug, source, destination);
  assert.equal(status.kind, "BLOCKED");
  if (status.kind === "BLOCKED") {
    assert.match(status.reason, /min.*max|INVALID_DOCUMENT/i);
  }
});

test("BLOCKED: converted document has score:null combined with leaderboard:true", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();
  const doc = ballDodgeLikeSource({
    policy: { score: null, leaderboard: true, xpPerCompletion: 0, requiresAuth: false },
  });
  source.documents.set(doc.slug, doc);

  const status = await classifyGenericCanonicalMigrationRow(doc.slug, source, destination);
  assert.equal(status.kind, "BLOCKED");
});

test("BLOCKED: converted document has an out-of-range xpPerCompletion", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();
  const doc = ballDodgeLikeSource({
    policy: {
      score: { unit: "pts", direction: "desc", min: 0, max: 100 },
      leaderboard: true,
      xpPerCompletion: 999_999,
      requiresAuth: false,
    },
  });
  source.documents.set(doc.slug, doc);

  const status = await classifyGenericCanonicalMigrationRow(doc.slug, source, destination);
  assert.equal(status.kind, "BLOCKED");
});

test("ERROR: a malformed/unreadable source Creator document propagates as ERROR at the SOURCE_READ stage", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();
  source.throwOnFindFor = "broken-source";

  const status = await classifyGenericCanonicalMigrationRow("broken-source", source, destination);
  assert.equal(status.kind, "ERROR");
  if (status.kind === "ERROR") {
    assert.equal(status.stage, "SOURCE_READ");
  }
});

test("ERROR: a malformed/unreadable destination document propagates as ERROR at the DESTINATION_READ stage", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();
  const doc = ballDodgeLikeSource({ slug: "broken-destination" });
  source.documents.set(doc.slug, doc);
  destination.throwOnFindFor = doc.slug;

  const status = await classifyGenericCanonicalMigrationRow(doc.slug, source, destination);
  assert.equal(status.kind, "ERROR");
  if (status.kind === "ERROR") {
    assert.equal(status.stage, "DESTINATION_READ");
  }
});

test("classifyGenericCanonicalMigrationRows classifies every slug independently, order-preserving", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();
  const missing = ballDodgeLikeSource({ slug: "missing-one" });
  source.documents.set(missing.slug, missing);

  const summary = await classifyGenericCanonicalMigrationRows(
    ["never-existed", missing.slug],
    source,
    destination,
  );
  assert.equal(summary.statuses[0]?.kind, "SOURCE_MISSING");
  assert.equal(summary.statuses[1]?.kind, "MISSING");
  assert.equal(summary.counts.SOURCE_MISSING, 1);
  assert.equal(summary.counts.MISSING, 1);
});

// ── dry-run / apply ───────────────────────────────────────────────────────────

test("dry-run performs zero writes to the destination", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);

  await classifyGenericCanonicalMigrationRows([doc.slug], source, destination);
  assert.equal(destination.documents.size, 0);
});

test("apply only writes MISSING slugs — MATCH/CONFLICT/BLOCKED/ERROR/SOURCE_MISSING are all skipped", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();

  const missing = ballDodgeLikeSource({ slug: "missing" });
  const matching = ballDodgeLikeSource({ slug: "matching" });
  const conflicting = ballDodgeLikeSource({ slug: "conflicting" });
  const blocked = ballDodgeLikeSource({
    slug: "blocked",
    policy: { score: null, leaderboard: true, xpPerCompletion: 0, requiresAuth: false },
  });

  source.documents.set(missing.slug, missing);
  source.documents.set(matching.slug, matching);
  destination.documents.set(matching.slug, expectedGeneric(matching));
  source.documents.set(conflicting.slug, conflicting);
  destination.documents.set(
    conflicting.slug,
    expectedGeneric(ballDodgeLikeSource({ slug: "conflicting", title: "Old Title" })),
  );
  source.documents.set(blocked.slug, blocked);
  source.throwOnFindFor = "error-slug";

  const result = await applyGenericCanonicalMigration(
    [missing.slug, matching.slug, conflicting.slug, blocked.slug, "error-slug", "never-existed"],
    source,
    destination,
  );

  const outcomeFor = (slug: string) => result.outcomes.find((o) => o.slug === slug);
  assert.equal(outcomeFor(missing.slug)?.kind, "CREATED");
  assert.equal(outcomeFor(matching.slug)?.kind, "SKIPPED");
  assert.equal(outcomeFor(conflicting.slug)?.kind, "SKIPPED");
  assert.equal(outcomeFor(blocked.slug)?.kind, "SKIPPED");
  assert.equal(outcomeFor("error-slug")?.kind, "SKIPPED");
  assert.equal(outcomeFor("never-existed")?.kind, "SKIPPED");

  // CONFLICT must never be overwritten by apply.
  assert.equal(destination.documents.get(conflicting.slug)?.title, "Old Title");
  // BLOCKED must never be written.
  assert.equal(destination.documents.has(blocked.slug), false);
});

test("post-write parity: a successful CREATED write is independently re-read and confirmed equal", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);

  const result = await applyGenericCanonicalMigration([doc.slug], source, destination);
  assert.equal(result.outcomes[0]?.kind, "CREATED");

  const found = await destination.findBySlug(doc.slug);
  assert.deepEqual(found, expectedGeneric(doc));
});

test("post-write failure: a save that succeeds but fails the parity re-read reports PARITY_MISMATCH_AFTER_WRITE", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);

  const originalSave = destination.save.bind(destination);
  destination.save = async (document) => {
    await originalSave(document);
    // Simulate an eventually-consistent store surfacing something other than what was just
    // written, by corrupting the stored value right after save reports success.
    destination.documents.set(document.slug, { ...document, title: "Corrupted After Write" });
  };

  const result = await applyGenericCanonicalMigration([doc.slug], source, destination);
  assert.equal(result.outcomes[0]?.kind, "PARITY_MISMATCH_AFTER_WRITE");
});

test("post-write failure: a save that throws is reported as WRITE_FAILED, not thrown out of apply", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);
  destination.throwOnSaveFor = doc.slug;

  const result = await applyGenericCanonicalMigration([doc.slug], source, destination);
  assert.equal(result.outcomes[0]?.kind, "WRITE_FAILED");
});

test("repeated apply is idempotent — the second run reports MATCH/SKIPPED, never rewrites", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);

  const first = await applyGenericCanonicalMigration([doc.slug], source, destination);
  assert.equal(first.outcomes[0]?.kind, "CREATED");

  const second = await applyGenericCanonicalMigration([doc.slug], source, destination);
  assert.equal(second.outcomes[0]?.kind, "SKIPPED");
  if (second.outcomes[0]?.kind === "SKIPPED") {
    assert.equal(second.outcomes[0].status, "MATCH");
  }
});

test("apply never accepts an overwrite/force option — save is only reached for a slug findBySlug just confirmed null", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);
  // Simulate a concurrent writer creating the destination document between classification and
  // apply's own pre-write recheck.
  const originalFindBySlug = destination.findBySlug.bind(destination);
  let findCalls = 0;
  destination.findBySlug = async (slug) => {
    findCalls++;
    if (findCalls === 2) {
      destination.documents.set(slug, expectedGeneric(doc));
    }
    return originalFindBySlug(slug);
  };

  const result = await applyGenericCanonicalMigration([doc.slug], source, destination);
  assert.equal(result.outcomes[0]?.kind, "RACE_LOST");
});

// ── critical regression: decimal exactness end-to-end ────────────────────────

test("critical regression: Creator decimal min/max survive conversion, generic parsing, and a repository round-trip exactly", async () => {
  const source = createFakeSource();
  const destination = createFakeDestination();
  const doc = ballDodgeLikeSource({
    policy: {
      score: { unit: "s", direction: "asc", min: 0.01, max: 359.99 },
      leaderboard: true,
      xpPerCompletion: 15,
      requiresAuth: false,
    },
  });
  source.documents.set(doc.slug, doc);

  const status = await classifyGenericCanonicalMigrationRow(doc.slug, source, destination);
  assert.equal(status.kind, "MISSING");
  if (status.kind !== "MISSING") return;
  assert.equal(status.document.policy.score?.min, 0.01);
  assert.equal(status.document.policy.score?.max, 359.99);

  const result = await applyGenericCanonicalMigration([doc.slug], source, destination);
  assert.equal(result.outcomes[0]?.kind, "CREATED");

  const found = await destination.findBySlug(doc.slug);
  assert.equal(found?.policy.score?.min, 0.01);
  assert.equal(found?.policy.score?.max, 359.99);
});
