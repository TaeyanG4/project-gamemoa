import test from "node:test";
import assert from "node:assert/strict";
import type { CreatorGameDefinitionRepository } from "../src/ports/creatorGameDefinition.js";
import type { CreatorGameCanonicalDocument } from "../src/domain/creatorGameCanonicalDocument.js";
import { CREATOR_GAME_DEFINITION_SCHEMA_VERSION } from "../src/domain/creatorGameCanonicalDocument.js";
import { mapSandboxGameRecordToCanonical } from "../src/domain/creatorGameCanonicalMapper.js";
import type { SandboxGameRecordCanonicalSource } from "../src/domain/creatorGameCanonicalMapper.js";
import {
  classifyBackfillRow,
  classifyBackfillRows,
  applyBackfill,
  canonicalDocumentsEqual,
} from "../src/application/creatorCanonicalBackfill.js";

/**
 * A fake, in-memory CreatorGameDefinitionRepository — no B2, no network. `throwOnFindFor` and
 * `throwOnSaveFor` simulate the two real failure modes Stage A's real adapter can propagate: a
 * malformed/unreadable stored document (CreatorGameCanonicalDocumentError, thrown from
 * findBySlug) and a raw storage failure (either method).
 */
function createFakeRepo(): CreatorGameDefinitionRepository & {
  documents: Map<string, CreatorGameCanonicalDocument>;
  throwOnFindFor?: string;
  throwOnSaveFor?: string;
} {
  return {
    documents: new Map(),
    async findBySlug(slug) {
      if (this.throwOnFindFor === slug) {
        throw new Error(`simulated malformed/unreadable document at ${slug}`);
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

function fullyConfiguredRow(
  overrides: Partial<SandboxGameRecordCanonicalSource> = {},
): SandboxGameRecordCanonicalSource {
  return {
    slug: "my-cool-game",
    title: "My Cool Game",
    shortDescription: "A short description",
    description: "A longer description.",
    genre: "puzzle",
    mode: "single",
    xpPerCompletion: 25,
    scoreUnit: "pts",
    scoreDirection: "desc",
    scoreMin: 0,
    scoreMax: 1000,
    scoreDisplayPrefix: null,
    scoreDisplaySuffix: null,
    updatedAt: "2026-08-15T09:30:00.000Z",
    ...overrides,
  };
}

function expectedDocument(row: SandboxGameRecordCanonicalSource): CreatorGameCanonicalDocument {
  const mapped = mapSandboxGameRecordToCanonical(row);
  assert.equal(mapped.ok, true, "test fixture row must map successfully");
  return mapped.ok ? mapped.document : (undefined as never);
}

// ── canonicalDocumentsEqual ──────────────────────────────────────────────────

test("canonicalDocumentsEqual is insensitive to key order", () => {
  const a: CreatorGameCanonicalDocument = {
    schemaVersion: CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
    slug: "x",
    title: "X",
    shortDescription: "",
    description: "",
    genre: "puzzle",
    mode: "single",
    policy: { score: null, leaderboard: false, xpPerCompletion: 0, requiresAuth: false },
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  // Same values, object literal built with fields in a different order.
  const b: CreatorGameCanonicalDocument = {
    updatedAt: "2026-01-01T00:00:00.000Z",
    policy: { requiresAuth: false, xpPerCompletion: 0, leaderboard: false, score: null },
    mode: "single",
    genre: "puzzle",
    description: "",
    shortDescription: "",
    title: "X",
    slug: "x",
    schemaVersion: CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
  };
  assert.equal(canonicalDocumentsEqual(a, b), true);
});

test("canonicalDocumentsEqual detects a real difference", () => {
  const a = expectedDocument(fullyConfiguredRow());
  const b = expectedDocument(fullyConfiguredRow({ title: "A Different Title" }));
  assert.equal(canonicalDocumentsEqual(a, b), false);
});

// ── classifyBackfillRow ──────────────────────────────────────────────────────

test("MISSING: no B2 document exists yet — classified as would-create, not an error", async () => {
  const repo = createFakeRepo();
  const row = fullyConfiguredRow();
  const status = await classifyBackfillRow(row, repo);
  assert.equal(status.kind, "MISSING");
  assert.deepEqual(status.kind === "MISSING" ? status.document : null, expectedDocument(row));
});

test("MATCH: a B2 document already equal to the generated one — no-op", async () => {
  const repo = createFakeRepo();
  const row = fullyConfiguredRow();
  repo.documents.set(row.slug, expectedDocument(row));
  const status = await classifyBackfillRow(row, repo);
  assert.deepEqual(status, { kind: "MATCH", slug: row.slug });
});

test("BLOCKED: an incomplete score policy is never mapped, mirroring the Stage B-1 mapper's own refusal", async () => {
  const repo = createFakeRepo();
  const row = fullyConfiguredRow({ scoreMin: null });
  const status = await classifyBackfillRow(row, repo);
  assert.deepEqual(status, {
    kind: "BLOCKED",
    slug: row.slug,
    reason: "SCORE_POLICY_NOT_CONFIGURED",
  });
});

test("CONFLICT: a stored B2 document disagrees with what the row maps to today — never auto-resolved", async () => {
  const repo = createFakeRepo();
  const row = fullyConfiguredRow();
  const stale = expectedDocument(fullyConfiguredRow({ title: "Stale Title From An Old Row" }));
  repo.documents.set(row.slug, stale);
  const status = await classifyBackfillRow(row, repo);
  assert.equal(status.kind, "CONFLICT");
  if (status.kind === "CONFLICT") {
    assert.deepEqual(status.stored, stale);
    assert.deepEqual(status.generated, expectedDocument(row));
  }
});

test("ERROR: a malformed/unreadable stored B2 document propagates as ERROR, not silently treated as missing", async () => {
  const repo = createFakeRepo();
  const row = fullyConfiguredRow();
  repo.throwOnFindFor = row.slug;
  const status = await classifyBackfillRow(row, repo);
  assert.equal(status.kind, "ERROR");
  assert.ok(status.kind === "ERROR" && status.message.includes("malformed"));
});

test("ERROR: a raw storage failure on read propagates the same way as a malformed document", async () => {
  const repo = createFakeRepo();
  const row = fullyConfiguredRow();
  repo.throwOnFindFor = row.slug; // the fake's one failure hook covers both cases identically
  const status = await classifyBackfillRow(row, repo);
  assert.equal(status.kind, "ERROR");
});

// ── classifyBackfillRows (dry-run) ───────────────────────────────────────────

test("dry-run classifies every row and never calls save — zero writes", async () => {
  const repo = createFakeRepo();
  const rows = [
    fullyConfiguredRow({ slug: "missing-game" }),
    fullyConfiguredRow({ slug: "matching-game" }),
    fullyConfiguredRow({ slug: "blocked-game", scoreMin: null }),
  ];
  repo.documents.set("matching-game", expectedDocument(rows[1]!));

  const summary = await classifyBackfillRows(rows, repo);

  assert.equal(repo.documents.size, 1, "no new document should have been written");
  assert.equal(summary.counts.MISSING, 1);
  assert.equal(summary.counts.MATCH, 1);
  assert.equal(summary.counts.BLOCKED, 1);
  assert.equal(summary.counts.CONFLICT, 0);
  assert.equal(summary.counts.ERROR, 0);
});

// ── applyBackfill ─────────────────────────────────────────────────────────────

test("apply only writes MISSING rows — MATCH/BLOCKED/CONFLICT/ERROR are all skipped, never written", async () => {
  const repo = createFakeRepo();
  const conflictRow = fullyConfiguredRow({ slug: "conflict-game" });
  const errorRow = fullyConfiguredRow({ slug: "error-game" });
  repo.documents.set(
    "conflict-game",
    expectedDocument(fullyConfiguredRow({ slug: "conflict-game", title: "Old" })),
  );
  repo.throwOnFindFor = "error-game";

  const rows = [
    fullyConfiguredRow({ slug: "missing-game" }),
    fullyConfiguredRow({ slug: "matching-game" }),
    fullyConfiguredRow({ slug: "blocked-game", scoreMin: null }),
    conflictRow,
    errorRow,
  ];
  repo.documents.set("matching-game", expectedDocument(rows[1]!));

  const result = await applyBackfill(rows, repo);

  const created = result.outcomes.filter((o) => o.kind === "CREATED").map((o) => o.slug);
  assert.deepEqual(created, ["missing-game"]);

  const skipped = result.outcomes.filter((o) => o.kind === "SKIPPED");
  assert.deepEqual(
    skipped.map((o) => [o.slug, o.kind === "SKIPPED" ? o.status : null]).sort(),
    [
      ["blocked-game", "BLOCKED"],
      ["conflict-game", "CONFLICT"],
      ["error-game", "ERROR"],
      ["matching-game", "MATCH"],
    ].sort(),
  );

  // The pre-existing conflicting document must still read back exactly as it was — never
  // overwritten by apply.
  assert.deepEqual(
    repo.documents.get("conflict-game"),
    expectedDocument(fullyConfiguredRow({ slug: "conflict-game", title: "Old" })),
  );
});

test("apply never accepts an overwrite/force option — save is only ever reached for a slug findBySlug just confirmed null", async () => {
  const repo = createFakeRepo();
  const row = fullyConfiguredRow({ slug: "already-there" });
  const existing = expectedDocument(
    fullyConfiguredRow({ slug: "already-there", title: "Existing" }),
  );
  repo.documents.set("already-there", existing);

  await applyBackfill([row], repo);

  assert.deepEqual(
    repo.documents.get("already-there"),
    existing,
    "existing document must be untouched",
  );
});

test("apply re-reads after each write to confirm parity with the generated document", async () => {
  const repo = createFakeRepo();
  const row = fullyConfiguredRow({ slug: "brand-new-game" });

  const result = await applyBackfill([row], repo);

  assert.deepEqual(result.outcomes, [{ kind: "CREATED", slug: "brand-new-game" }]);
  const stored = repo.documents.get("brand-new-game");
  assert.deepEqual(stored, expectedDocument(row));
});

test("a write failure on one row does not stop other MISSING rows from being attempted, and reports WRITE_FAILED rather than throwing", async () => {
  const repo = createFakeRepo();
  repo.throwOnSaveFor = "will-fail";
  const rows = [
    fullyConfiguredRow({ slug: "will-fail" }),
    fullyConfiguredRow({ slug: "will-succeed" }),
  ];

  const result = await applyBackfill(rows, repo);

  const failed = result.outcomes.find((o) => o.slug === "will-fail");
  assert.equal(failed?.kind, "WRITE_FAILED");
  const succeeded = result.outcomes.find((o) => o.slug === "will-succeed");
  assert.equal(succeeded?.kind, "CREATED");
  assert.equal(
    repo.documents.has("will-fail"),
    false,
    "a failed save must not leave a partial document behind",
  );
});

test("apply is idempotent — running it twice in a row only creates each MISSING document once, second run reports MATCH", async () => {
  const repo = createFakeRepo();
  const rows = [fullyConfiguredRow({ slug: "idempotent-game" })];

  const first = await applyBackfill(rows, repo);
  assert.deepEqual(first.outcomes, [{ kind: "CREATED", slug: "idempotent-game" }]);

  const second = await applyBackfill(rows, repo);
  assert.deepEqual(second.outcomes, [
    { kind: "SKIPPED", slug: "idempotent-game", status: "MATCH" },
  ]);
  assert.equal(repo.documents.size, 1);
});

// ── best-effort no-overwrite under a concurrent writer (RACE_LOST) ──────────────
//
// B2's S3-compatible API has no conditional-write primitive (see this module's own top doc
// comment for the evidence), so applyBackfill cannot make save() a true atomic create-if-absent.
// What it does instead is re-check findBySlug immediately before save() — these tests simulate a
// second writer creating the document in the gap between the original classification and that
// final recheck, and assert the racing writer's document always wins, never this run's.

function createRaceSimulatingRepo(
  raceSlug: string,
  concurrentDocument: CreatorGameCanonicalDocument,
): CreatorGameDefinitionRepository & { documents: Map<string, CreatorGameCanonicalDocument> } {
  const documents = new Map<string, CreatorGameCanonicalDocument>();
  let findCallsForRaceSlug = 0;
  return {
    documents,
    async findBySlug(slug) {
      if (slug === raceSlug) {
        findCallsForRaceSlug++;
        // The 2nd call is applyBackfill's own pre-save recheck (the 1st was the original
        // classification) — simulate another writer having created the document in between.
        if (findCallsForRaceSlug === 2) {
          documents.set(raceSlug, concurrentDocument);
        }
      }
      return documents.get(slug) ?? null;
    },
    async save(document) {
      documents.set(document.slug, document);
    },
    async delete(slug) {
      documents.delete(slug);
    },
  };
}

test("apply never overwrites a document another writer created between classification and save — RACE_LOST, not CREATED", async () => {
  const row = fullyConfiguredRow({ slug: "raced-game" });
  const concurrentDocument = expectedDocument(
    fullyConfiguredRow({ slug: "raced-game", title: "Created By The Other Writer" }),
  );
  const repo = createRaceSimulatingRepo("raced-game", concurrentDocument);

  const result = await applyBackfill([row], repo);

  assert.deepEqual(result.outcomes, [{ kind: "RACE_LOST", slug: "raced-game" }]);
  assert.deepEqual(
    repo.documents.get("raced-game"),
    concurrentDocument,
    "the racing writer's document must be left exactly as it was — never overwritten",
  );
});

test("a failure during the pre-save race recheck itself is reported as WRITE_FAILED, never silently proceeds to save", async () => {
  const repo = createFakeRepo();
  let findCalls = 0;
  const originalFindBySlug = repo.findBySlug.bind(repo);
  repo.findBySlug = async (slug: string) => {
    findCalls++;
    if (slug === "recheck-fails" && findCalls === 2) {
      throw new Error("simulated storage failure during race recheck");
    }
    return originalFindBySlug(slug);
  };

  const result = await applyBackfill([fullyConfiguredRow({ slug: "recheck-fails" })], repo);

  assert.equal(result.outcomes.length, 1);
  assert.equal(result.outcomes[0]!.kind, "WRITE_FAILED");
  assert.equal(repo.documents.has("recheck-fails"), false);
});
