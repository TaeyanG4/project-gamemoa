import test from "node:test";
import assert from "node:assert/strict";
import type { CreatorGameDefinitionRepository, CreatorGameCanonicalDocument } from "@owogg/core";
import { classifyBackfillRows, applyBackfill } from "@owogg/core";
import {
  parseBackfillCliArgs,
  parseBackfillInputRows,
  formatBackfillReport,
  formatBackfillApplyReport,
  runCreatorCanonicalBackfillCli,
} from "./creator-canonical-backfill.js";

/**
 * CLI-layer coverage for the Stage B-2 backfill tool — argv parsing, input-file shape validation,
 * output formatting, and the CLI's own top-level flow (against a fake repository and an in-memory
 * "file", never real fs/B2). The classification/apply orchestration itself is covered in
 * packages/core/test/creatorCanonicalBackfill.test.ts — this suite only exercises the thin wiring
 * this file adds on top of it.
 */

function fakeRepo(): CreatorGameDefinitionRepository & {
  documents: Map<string, CreatorGameCanonicalDocument>;
} {
  return {
    documents: new Map(),
    async findBySlug(slug) {
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

function validRowJson(overrides: Record<string, unknown> = {}): Record<string, unknown> {
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

// ── parseBackfillCliArgs ─────────────────────────────────────────────────────

test("parseBackfillCliArgs: --input alone is a valid dry-run invocation", () => {
  const args = parseBackfillCliArgs(["--input", "rows.json"]);
  assert.deepEqual(args, { inputPath: "rows.json", apply: false });
});

test("parseBackfillCliArgs: --apply requires an explicit flag — never on by default", () => {
  const args = parseBackfillCliArgs(["--input", "rows.json", "--apply"]);
  assert.deepEqual(args, { inputPath: "rows.json", apply: true });
});

test("parseBackfillCliArgs: missing --input throws with usage", () => {
  assert.throws(() => parseBackfillCliArgs(["--apply"]), /--input/);
});

test("parseBackfillCliArgs: --input with no following value throws", () => {
  assert.throws(() => parseBackfillCliArgs(["--input"]), /requires a file path/);
});

test("parseBackfillCliArgs: an unrecognized flag throws rather than being silently ignored", () => {
  assert.throws(
    () => parseBackfillCliArgs(["--input", "rows.json", "--force"]),
    /unrecognized argument/,
  );
});

// ── parseBackfillInputRows ───────────────────────────────────────────────────

test("parseBackfillInputRows: a well-formed row round-trips cleanly", () => {
  const rows = parseBackfillInputRows(JSON.stringify([validRowJson()]));
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.slug, "my-cool-game");
  assert.equal(rows[0]!.scoreMin, 0);
});

test("parseBackfillInputRows: malformed JSON fails closed with a clear error", () => {
  assert.throws(() => parseBackfillInputRows("{ not valid json"), /not valid JSON/);
});

test("parseBackfillInputRows: a non-array top level fails closed", () => {
  assert.throws(
    () => parseBackfillInputRows(JSON.stringify(validRowJson())),
    /must be a JSON array/,
  );
});

test("parseBackfillInputRows: a row missing a required field fails closed", () => {
  const bad = validRowJson();
  delete bad.title;
  assert.throws(() => parseBackfillInputRows(JSON.stringify([bad])), /"title"/);
});

test("parseBackfillInputRows: an invalid mode value fails closed", () => {
  const bad = validRowJson({ mode: "duo" });
  assert.throws(() => parseBackfillInputRows(JSON.stringify([bad])), /"mode"/);
});

test("parseBackfillInputRows: null score_* columns are accepted as-is (an incomplete score policy is a BLOCKED classification, not a parse error)", () => {
  const partial = validRowJson({
    scoreMin: null,
    scoreMax: null,
    scoreUnit: null,
    scoreDirection: null,
  });
  const rows = parseBackfillInputRows(JSON.stringify([partial]));
  assert.equal(rows[0]!.scoreMin, null);
});

test("parseBackfillInputRows: D1-only fields in an export (id, developerUserId, visibility, ...) are dropped, never carried through", () => {
  const withExtra = {
    ...validRowJson(),
    id: 42,
    developerUserId: 7,
    visibility: "PRIVATE",
    liveVersionId: 99,
    reviewSlot: 1,
    deletedAt: null,
    logoKey: "games/42/logo.png",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const rows = parseBackfillInputRows(JSON.stringify([withExtra]));
  const serialized = JSON.stringify(rows[0]);
  for (const leaked of [
    "developerUserId",
    "visibility",
    "liveVersionId",
    "reviewSlot",
    "logoKey",
    "createdAt",
  ]) {
    assert.ok(!serialized.includes(leaked), `parsed row must not retain "${leaked}"`);
  }
});

// ── formatBackfillReport / formatBackfillApplyReport ─────────────────────────

test("formatBackfillReport: never touches B2 config/credentials — only slugs, statuses, and reasons appear", async () => {
  const repo = fakeRepo();
  const rows = parseBackfillInputRows(
    JSON.stringify([validRowJson({ slug: "a" }), validRowJson({ slug: "b", scoreMin: null })]),
  );
  const summary = await classifyBackfillRows(rows, repo);
  const report = formatBackfillReport(summary);
  assert.match(report, /MISSING\s+a/);
  assert.match(report, /BLOCKED\s+b/);
  assert.match(report, /summary: MISSING=1 MATCH=0 BLOCKED=1 CONFLICT=0 ERROR=0/);
});

test("formatBackfillApplyReport: includes both the dry-run-equivalent classification and the actual write outcomes", async () => {
  const repo = fakeRepo();
  const rows = parseBackfillInputRows(JSON.stringify([validRowJson({ slug: "created-game" })]));
  const result = await applyBackfill(rows, repo);
  const report = formatBackfillApplyReport(result);
  assert.match(report, /MISSING\s+created-game/);
  assert.match(report, /CREATED\s+created-game/);
});

// ── runCreatorCanonicalBackfillCli ───────────────────────────────────────────

test("runCreatorCanonicalBackfillCli: dry-run reads the input file, classifies, logs a report, and never calls save", async () => {
  const repo = fakeRepo();
  let saveCalls = 0;
  const trackedRepo: CreatorGameDefinitionRepository = {
    findBySlug: (slug) => repo.findBySlug(slug),
    save: (doc) => {
      saveCalls++;
      return repo.save(doc);
    },
    delete: (slug) => repo.delete(slug),
  };

  const logs: string[] = [];
  await runCreatorCanonicalBackfillCli(
    { inputPath: "rows.json", apply: false },
    {
      readFile: () => JSON.stringify([validRowJson({ slug: "dry-run-game" })]),
      repo: trackedRepo,
      log: (msg) => logs.push(msg),
    },
  );

  assert.equal(saveCalls, 0, "dry-run must perform zero writes");
  assert.equal(logs.length, 1);
  assert.match(logs[0]!, /MISSING\s+dry-run-game/);
});

test("runCreatorCanonicalBackfillCli: apply mode writes MISSING rows and logs a write-outcome report", async () => {
  const repo = fakeRepo();
  const logs: string[] = [];

  await runCreatorCanonicalBackfillCli(
    { inputPath: "rows.json", apply: true },
    {
      readFile: () => JSON.stringify([validRowJson({ slug: "apply-game" })]),
      repo,
      log: (msg) => logs.push(msg),
    },
  );

  assert.equal(repo.documents.size, 1);
  assert.ok(repo.documents.has("apply-game"));
  assert.match(logs[0]!, /CREATED\s+apply-game/);
});

test("runCreatorCanonicalBackfillCli: a malformed input file fails closed before any repository call", async () => {
  const repo = fakeRepo();
  let repoCalled = false;
  const trackedRepo: CreatorGameDefinitionRepository = {
    findBySlug: (slug) => {
      repoCalled = true;
      return repo.findBySlug(slug);
    },
    save: (doc) => {
      repoCalled = true;
      return repo.save(doc);
    },
    delete: (slug) => repo.delete(slug),
  };

  await assert.rejects(
    runCreatorCanonicalBackfillCli(
      { inputPath: "rows.json", apply: false },
      { readFile: () => "not json", repo: trackedRepo, log: () => {} },
    ),
  );
  assert.equal(repoCalled, false);
});
