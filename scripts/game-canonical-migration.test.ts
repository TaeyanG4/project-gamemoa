import test from "node:test";
import assert from "node:assert/strict";
import type {
  CreatorGameDefinitionRepository,
  CreatorGameCanonicalDocument,
  GameCanonicalRepository,
  GameCanonicalDocument,
} from "@owogg/core";
import { CREATOR_GAME_DEFINITION_SCHEMA_VERSION } from "@owogg/core";
import {
  parseGameCanonicalMigrationCliArgs,
  formatGameCanonicalMigrationReport,
  formatGameCanonicalMigrationApplyReport,
  determineGameCanonicalMigrationExitCode,
  hasFatalApplyFailure,
  runGameCanonicalMigrationCli,
} from "./game-canonical-migration.js";

/**
 * CLI-layer coverage for the Stage U-4 generic canonical migration tool — argv parsing, output
 * formatting, exit-code tiering, and the CLI's own top-level flow (against fake in-memory
 * repositories, never real B2). The classification/apply orchestration itself is covered in
 * packages/core/test/genericCanonicalMigration.test.ts (Stage U-2) — this suite only exercises
 * the thin wiring this file adds on top of it. `readB2ConfigFromEnv` (config reading) already has
 * its own coverage in official-game-bundle-builder.test.ts — not duplicated here.
 */

function fakeSource(): CreatorGameDefinitionRepository & {
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

function fakeDestination(): GameCanonicalRepository & {
  documents: Map<string, GameCanonicalDocument>;
  putCalls: number;
  deleteCalls: number;
  throwOnFindFor?: string;
  throwOnSaveFor?: string;
} {
  return {
    documents: new Map(),
    putCalls: 0,
    deleteCalls: 0,
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
      this.putCalls++;
      this.documents.set(document.slug, document);
    },
    async delete(slug) {
      this.deleteCalls++;
      this.documents.delete(slug);
    },
  };
}

/** A GENRE_MODE Creator source shaped like production's ball-dodge (seconds score, decimal-safe
 * bounds, requiresAuth=false, leaderboard=true) — used as a fixture only, per this Stage's own
 * task description; no real production B2 object is ever touched by this file. */
function ballDodgeLikeSource(
  overrides: Partial<CreatorGameCanonicalDocument> = {},
): CreatorGameCanonicalDocument {
  return {
    schemaVersion: CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
    slug: "ball-dodge",
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
  // Local, minimal re-derivation kept independent of the production converter import so this
  // fixture doesn't accidentally hide a regression in the converter itself — mirrors what
  // packages/core/test/genericCanonicalMigration.test.ts already verifies exhaustively.
  return {
    schemaVersion: 1,
    slug: source.slug,
    title: source.title,
    shortDescription: source.shortDescription,
    description: source.description,
    policy: source.policy,
    supportsReplay: false,
    catalog: { type: "GENRE_MODE", genre: source.genre, mode: source.mode },
    updatedAt: source.updatedAt,
  };
}

// ── parseGameCanonicalMigrationCliArgs ───────────────────────────────────────

test("parseGameCanonicalMigrationCliArgs: --slug + --dry-run is a valid invocation", () => {
  const args = parseGameCanonicalMigrationCliArgs(["--slug", "ball-dodge", "--dry-run"]);
  assert.deepEqual(args, { slugs: ["ball-dodge"], apply: false });
});

test("parseGameCanonicalMigrationCliArgs: --slug + --apply is a valid invocation", () => {
  const args = parseGameCanonicalMigrationCliArgs(["--slug", "ball-dodge", "--apply"]);
  assert.deepEqual(args, { slugs: ["ball-dodge"], apply: true });
});

test("parseGameCanonicalMigrationCliArgs: repeated --slug collects multiple slugs, in order", () => {
  const args = parseGameCanonicalMigrationCliArgs(["--slug", "a", "--slug", "b", "--dry-run"]);
  assert.deepEqual(args.slugs, ["a", "b"]);
});

test("parseGameCanonicalMigrationCliArgs: neither --dry-run nor --apply is rejected", () => {
  assert.throws(
    () => parseGameCanonicalMigrationCliArgs(["--slug", "ball-dodge"]),
    /exactly one of --dry-run or --apply is required/,
  );
});

test("parseGameCanonicalMigrationCliArgs: both --dry-run and --apply together is rejected", () => {
  assert.throws(
    () => parseGameCanonicalMigrationCliArgs(["--slug", "ball-dodge", "--dry-run", "--apply"]),
    /mutually exclusive/,
  );
});

test("parseGameCanonicalMigrationCliArgs: no --slug at all is rejected", () => {
  assert.throws(
    () => parseGameCanonicalMigrationCliArgs(["--dry-run"]),
    /--slug <slug> is required/,
  );
});

test("parseGameCanonicalMigrationCliArgs: --slug with no following value throws", () => {
  assert.throws(() => parseGameCanonicalMigrationCliArgs(["--slug"]), /requires a value/);
});

test("parseGameCanonicalMigrationCliArgs: an unrecognized flag throws rather than being silently ignored", () => {
  assert.throws(
    () => parseGameCanonicalMigrationCliArgs(["--slug", "ball-dodge", "--dry-run", "--force"]),
    /unrecognized argument/,
  );
});

// ── dry-run classification, via runGameCanonicalMigrationCli ────────────────

test("dry-run: SOURCE_MISSING for a slug with no Creator canonical", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  const logs: string[] = [];

  const exitCode = await runGameCanonicalMigrationCli(
    { slugs: ["nowhere"], apply: false },
    { source, destination, log: (m) => logs.push(m) },
  );

  assert.match(logs[0]!, /SOURCE_MISSING\s+nowhere/);
  assert.equal(destination.putCalls, 0);
  assert.equal(exitCode, 2);
});

test("dry-run: MISSING for a valid Creator source with nothing at the generic destination", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);
  const logs: string[] = [];

  const exitCode = await runGameCanonicalMigrationCli(
    { slugs: [doc.slug], apply: false },
    { source, destination, log: (m) => logs.push(m) },
  );

  assert.match(logs[0]!, /MISSING\s+ball-dodge/);
  assert.equal(destination.putCalls, 0, "dry-run must perform zero writes");
  assert.equal(exitCode, 0, "MISSING in dry-run is not itself a failure");
});

test("dry-run: MATCH when the destination already equals what the source converts to", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);
  destination.documents.set(doc.slug, expectedGeneric(doc));
  const logs: string[] = [];

  const exitCode = await runGameCanonicalMigrationCli(
    { slugs: [doc.slug], apply: false },
    { source, destination, log: (m) => logs.push(m) },
  );

  assert.match(logs[0]!, /MATCH\s+ball-dodge/);
  assert.equal(exitCode, 0);
});

test("dry-run: CONFLICT when the destination disagrees with the current source", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);
  destination.documents.set(doc.slug, expectedGeneric(ballDodgeLikeSource({ title: "Old" })));
  const logs: string[] = [];

  const exitCode = await runGameCanonicalMigrationCli(
    { slugs: [doc.slug], apply: false },
    { source, destination, log: (m) => logs.push(m) },
  );

  assert.match(logs[0]!, /CONFLICT\s+ball-dodge/);
  assert.equal(exitCode, 2);
});

test("dry-run: BLOCKED when the source converts to a semantically-invalid generic document", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  const doc = ballDodgeLikeSource({
    policy: { score: null, leaderboard: true, xpPerCompletion: 0, requiresAuth: false },
  });
  source.documents.set(doc.slug, doc);
  const logs: string[] = [];

  const exitCode = await runGameCanonicalMigrationCli(
    { slugs: [doc.slug], apply: false },
    { source, destination, log: (m) => logs.push(m) },
  );

  assert.match(logs[0]!, /BLOCKED\s+ball-dodge/);
  assert.match(logs[0]!, /repair the Creator canonical/);
  assert.equal(exitCode, 2);
});

test("dry-run: ERROR (SOURCE_READ) when the source read itself fails", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  source.throwOnFindFor = "broken";
  const logs: string[] = [];

  const exitCode = await runGameCanonicalMigrationCli(
    { slugs: ["broken"], apply: false },
    { source, destination, log: (m) => logs.push(m) },
  );

  assert.match(logs[0]!, /ERROR\s+broken\s+\(SOURCE_READ:/);
  assert.equal(exitCode, 1);
});

test("dry-run: ERROR (DESTINATION_READ) when the destination read itself fails", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  const doc = ballDodgeLikeSource({ slug: "broken-dest" });
  source.documents.set(doc.slug, doc);
  destination.throwOnFindFor = doc.slug;
  const logs: string[] = [];

  const exitCode = await runGameCanonicalMigrationCli(
    { slugs: [doc.slug], apply: false },
    { source, destination, log: (m) => logs.push(m) },
  );

  assert.match(logs[0]!, /ERROR\s+broken-dest\s+\(DESTINATION_READ:/);
  assert.equal(exitCode, 1);
});

test("dry-run: writes zero regardless of status mix", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  const missing = ballDodgeLikeSource({ slug: "missing" });
  const blocked = ballDodgeLikeSource({
    slug: "blocked",
    policy: { score: null, leaderboard: true, xpPerCompletion: 0, requiresAuth: false },
  });
  source.documents.set(missing.slug, missing);
  source.documents.set(blocked.slug, blocked);

  await runGameCanonicalMigrationCli(
    { slugs: ["nowhere", missing.slug, blocked.slug], apply: false },
    { source, destination, log: () => {} },
  );

  assert.equal(destination.putCalls, 0);
});

// ── apply behavior ────────────────────────────────────────────────────────────

test("apply: MISSING -> CREATED, exact converted parity", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);
  const logs: string[] = [];

  const exitCode = await runGameCanonicalMigrationCli(
    { slugs: [doc.slug], apply: true },
    { source, destination, log: (m) => logs.push(m) },
  );

  assert.match(logs[0]!, /CREATED\s+ball-dodge/);
  assert.deepEqual(destination.documents.get(doc.slug), expectedGeneric(doc));
  assert.equal(exitCode, 0);
});

test("apply: MATCH is skipped, never rewritten", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);
  destination.documents.set(doc.slug, expectedGeneric(doc));

  await runGameCanonicalMigrationCli(
    { slugs: [doc.slug], apply: true },
    { source, destination, log: () => {} },
  );

  assert.equal(destination.putCalls, 0);
});

test("apply: CONFLICT is skipped, never overwritten", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);
  const stale = expectedGeneric(ballDodgeLikeSource({ title: "Stale" }));
  destination.documents.set(doc.slug, stale);

  const exitCode = await runGameCanonicalMigrationCli(
    { slugs: [doc.slug], apply: true },
    { source, destination, log: () => {} },
  );

  assert.equal(destination.putCalls, 0);
  assert.deepEqual(destination.documents.get(doc.slug), stale);
  assert.equal(exitCode, 2);
});

test("apply: BLOCKED is skipped, never written", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  const doc = ballDodgeLikeSource({
    policy: { score: null, leaderboard: true, xpPerCompletion: 0, requiresAuth: false },
  });
  source.documents.set(doc.slug, doc);

  const exitCode = await runGameCanonicalMigrationCli(
    { slugs: [doc.slug], apply: true },
    { source, destination, log: () => {} },
  );

  assert.equal(destination.documents.has(doc.slug), false);
  assert.equal(destination.putCalls, 0);
  assert.equal(exitCode, 2);
});

test("apply: an ERROR slug is skipped, never written", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  source.throwOnFindFor = "broken";

  const exitCode = await runGameCanonicalMigrationCli(
    { slugs: ["broken"], apply: true },
    { source, destination, log: () => {} },
  );

  assert.equal(destination.putCalls, 0);
  assert.equal(exitCode, 1);
});

test("apply: never deletes anything from the destination, on any status", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  const missing = ballDodgeLikeSource({ slug: "missing" });
  const conflicting = ballDodgeLikeSource({ slug: "conflicting" });
  source.documents.set(missing.slug, missing);
  source.documents.set(conflicting.slug, conflicting);
  destination.documents.set(
    conflicting.slug,
    expectedGeneric(ballDodgeLikeSource({ slug: "conflicting", title: "Old" })),
  );

  await runGameCanonicalMigrationCli(
    { slugs: [missing.slug, conflicting.slug, "nowhere"], apply: true },
    { source, destination, log: () => {} },
  );

  assert.equal(destination.deleteCalls, 0);
});

test("apply: repeated runs over the same slug are idempotent — second run reports SKIPPED/MATCH, no rewrite", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);

  const first = await runGameCanonicalMigrationCli(
    { slugs: [doc.slug], apply: true },
    { source, destination, log: () => {} },
  );
  assert.equal(first, 0);
  assert.equal(destination.putCalls, 1);

  const logs: string[] = [];
  const second = await runGameCanonicalMigrationCli(
    { slugs: [doc.slug], apply: true },
    { source, destination, log: (m) => logs.push(m) },
  );

  assert.equal(destination.putCalls, 1, "the second run must not write again");
  assert.match(logs[0]!, /SKIPPED\s+ball-dodge\s+\(status: MATCH\)/);
  assert.equal(second, 0);
});

// ── formatting ────────────────────────────────────────────────────────────────

test("formatGameCanonicalMigrationReport: never touches B2 config/credentials — only slugs, statuses, and reasons appear", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  const a = ballDodgeLikeSource({ slug: "a" });
  source.documents.set(a.slug, a);
  const logs: string[] = [];

  await runGameCanonicalMigrationCli(
    { slugs: ["a", "b"], apply: false },
    { source, destination, log: (m) => logs.push(m) },
  );

  assert.match(logs[0]!, /MISSING\s+a/);
  assert.match(logs[0]!, /SOURCE_MISSING\s+b/);
  assert.match(
    logs[0]!,
    /summary: SOURCE_MISSING=1 MISSING=1 MATCH=0 BLOCKED=0 CONFLICT=0 ERROR=0/,
  );
});

test("formatGameCanonicalMigrationApplyReport: includes both classification and the actual write outcomes", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  const doc = ballDodgeLikeSource();
  source.documents.set(doc.slug, doc);
  const logs: string[] = [];

  await runGameCanonicalMigrationCli(
    { slugs: [doc.slug], apply: true },
    { source, destination, log: (m) => logs.push(m) },
  );

  assert.match(logs[0]!, /MISSING\s+ball-dodge/);
  assert.match(logs[0]!, /CREATED\s+ball-dodge/);
});

// ── determineGameCanonicalMigrationExitCode / hasFatalApplyFailure ───────────

function summaryWithCounts(
  counts: Partial<
    Record<"SOURCE_MISSING" | "MISSING" | "MATCH" | "BLOCKED" | "CONFLICT" | "ERROR", number>
  >,
) {
  return {
    statuses: [],
    counts: {
      SOURCE_MISSING: 0,
      MISSING: 0,
      MATCH: 0,
      BLOCKED: 0,
      CONFLICT: 0,
      ERROR: 0,
      ...counts,
    },
  };
}

test("determineGameCanonicalMigrationExitCode: dry-run with only MISSING/MATCH is exit 0 (clean dry-run)", () => {
  const code = determineGameCanonicalMigrationExitCode({
    mode: "dry-run",
    summary: summaryWithCounts({ MISSING: 2, MATCH: 3 }),
  });
  assert.equal(code, 0);
});

test("determineGameCanonicalMigrationExitCode: dry-run CONFLICT is exit 2", () => {
  const code = determineGameCanonicalMigrationExitCode({
    mode: "dry-run",
    summary: summaryWithCounts({ CONFLICT: 1 }),
  });
  assert.equal(code, 2);
});

test("determineGameCanonicalMigrationExitCode: dry-run BLOCKED is exit 2 (needs source repair, not routine)", () => {
  const code = determineGameCanonicalMigrationExitCode({
    mode: "dry-run",
    summary: summaryWithCounts({ BLOCKED: 1 }),
  });
  assert.equal(code, 2);
});

test("determineGameCanonicalMigrationExitCode: dry-run SOURCE_MISSING is exit 2 (likely a slug typo)", () => {
  const code = determineGameCanonicalMigrationExitCode({
    mode: "dry-run",
    summary: summaryWithCounts({ SOURCE_MISSING: 1 }),
  });
  assert.equal(code, 2);
});

test("determineGameCanonicalMigrationExitCode: dry-run ERROR is exit 1 (storage error)", () => {
  const code = determineGameCanonicalMigrationExitCode({
    mode: "dry-run",
    summary: summaryWithCounts({ ERROR: 1 }),
  });
  assert.equal(code, 1);
});

test("determineGameCanonicalMigrationExitCode: a clean apply (CREATED + SKIPPED-for-MATCH only) is exit 0", () => {
  const code = determineGameCanonicalMigrationExitCode({
    mode: "apply",
    result: {
      summary: summaryWithCounts({ MISSING: 1, MATCH: 1 }),
      outcomes: [
        { kind: "CREATED", slug: "a" },
        { kind: "SKIPPED", slug: "b", status: "MATCH" },
      ],
    },
  });
  assert.equal(code, 0);
});

test("determineGameCanonicalMigrationExitCode: apply WRITE_FAILED is exit 1 (write/parity failure)", () => {
  const code = determineGameCanonicalMigrationExitCode({
    mode: "apply",
    result: {
      summary: summaryWithCounts({ MISSING: 1 }),
      outcomes: [{ kind: "WRITE_FAILED", slug: "x", message: "boom" }],
    },
  });
  assert.equal(code, 1);
});

test("determineGameCanonicalMigrationExitCode: apply PARITY_MISMATCH_AFTER_WRITE is exit 1 (write/parity failure)", () => {
  const code = determineGameCanonicalMigrationExitCode({
    mode: "apply",
    result: {
      summary: summaryWithCounts({ MISSING: 1 }),
      outcomes: [{ kind: "PARITY_MISMATCH_AFTER_WRITE", slug: "x" }],
    },
  });
  assert.equal(code, 1);
});

test("determineGameCanonicalMigrationExitCode: apply RACE_LOST is exit 2, not fatal", () => {
  const code = determineGameCanonicalMigrationExitCode({
    mode: "apply",
    result: {
      summary: summaryWithCounts({ MISSING: 1 }),
      outcomes: [{ kind: "RACE_LOST", slug: "x" }],
    },
  });
  assert.equal(code, 2);
});

test("hasFatalApplyFailure: true only for WRITE_FAILED/PARITY_MISMATCH_AFTER_WRITE", () => {
  assert.equal(hasFatalApplyFailure([{ kind: "CREATED", slug: "x" }]), false);
  assert.equal(hasFatalApplyFailure([{ kind: "SKIPPED", slug: "x", status: "MATCH" }]), false);
  assert.equal(hasFatalApplyFailure([{ kind: "RACE_LOST", slug: "x" }]), false);
  assert.equal(hasFatalApplyFailure([{ kind: "WRITE_FAILED", slug: "x", message: "boom" }]), true);
  assert.equal(hasFatalApplyFailure([{ kind: "PARITY_MISMATCH_AFTER_WRITE", slug: "x" }]), true);
});

// ── critical regression: decimal exactness end-to-end through the CLI ────────

test("critical regression: Creator decimal min/max survive conversion into the generic destination via the CLI's apply path", async () => {
  const source = fakeSource();
  const destination = fakeDestination();
  const doc = ballDodgeLikeSource({
    policy: {
      score: { unit: "s", direction: "asc", min: 0.01, max: 359.99 },
      leaderboard: true,
      xpPerCompletion: 15,
      requiresAuth: false,
    },
  });
  source.documents.set(doc.slug, doc);

  await runGameCanonicalMigrationCli(
    { slugs: [doc.slug], apply: true },
    { source, destination, log: () => {} },
  );

  const found = destination.documents.get(doc.slug);
  assert.equal(found?.policy.score?.min, 0.01);
  assert.equal(found?.policy.score?.max, 359.99);
});
