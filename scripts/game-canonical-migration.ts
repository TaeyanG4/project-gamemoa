import type { BackblazeB2Config } from "@owogg/db";
import {
  BackblazeB2GameBundleRepository,
  B2CreatorGameDefinitionRepository,
  B2GameCanonicalRepository,
} from "@owogg/db";
import type {
  CreatorGameDefinitionRepository,
  GameCanonicalRepository,
  GenericCanonicalMigrationSummary,
  GenericCanonicalMigrationApplyResult,
  GenericCanonicalMigrationApplyOutcome,
} from "@owogg/core";
import { classifyGenericCanonicalMigrationRows, applyGenericCanonicalMigration } from "@owogg/core";

/**
 * Unified Game Platform, Stage U-4 — the CLI-facing half of the generic canonical migration tool.
 * All orchestration logic (classification, apply-mode writes, parity re-read, the
 * SOURCE_MISSING/MISSING/MATCH/BLOCKED/CONFLICT/ERROR status model) already lives in
 * packages/core/src/application/genericCanonicalMigration.ts (Stage U-2), provider-neutral and
 * independently tested there — this file is ONLY argv parsing, B2 repository wiring, output
 * formatting, and the exit-code contract. No new migration algorithm is written here. No top-level
 * side effects (same split as creator-canonical-backfill.ts/run-creator-canonical-backfill.ts):
 * every exported function here is safely importable by this file's own test suite without
 * touching real B2. See run-game-canonical-migration.ts for the thin runner that actually calls
 * `main()`.
 *
 * Slug enumeration: unlike creator-canonical-backfill.ts (which reads an exported D1 rows file),
 * this tool takes explicit `--slug` values only — no B2 prefix listing, no "discover every game"
 * mode. `GameBundleStorageRepository` (ports/sandboxGames.ts) has no list/prefix operation, and
 * this Stage's own task description explicitly forbids inventing one just for this tool.
 */

export interface GameCanonicalMigrationCliArgs {
  readonly slugs: readonly string[];
  readonly apply: boolean;
}

const USAGE =
  "usage: tsx scripts/run-game-canonical-migration.ts --slug <slug> [--slug <slug> ...] (--dry-run | --apply)\n" +
  "  --dry-run = READ ONLY. Classifies every slug against B2; zero writes, ever.\n" +
  "  --apply   = writes ONLY the generic canonical objects for slugs classified MISSING;\n" +
  "              every other status (SOURCE_MISSING/MATCH/BLOCKED/CONFLICT/ERROR) is always skipped,\n" +
  "              never overwritten, never deleted, never force-repaired.\n" +
  "  Exactly one of --dry-run/--apply is required — there is no default write mode.";

/** Pure argv parser — no filesystem, no env, no B2. Throws with {@link USAGE} on anything it
 * doesn't recognize, rather than guessing at operator intent. */
export function parseGameCanonicalMigrationCliArgs(
  argv: readonly string[],
): GameCanonicalMigrationCliArgs {
  const slugs: string[] = [];
  let dryRun = false;
  let apply = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    if (arg === "--slug") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error(`--slug requires a value\n\n${USAGE}`);
      }
      slugs.push(value);
      i++;
      continue;
    }
    throw new Error(`unrecognized argument: ${arg}\n\n${USAGE}`);
  }

  if (slugs.length === 0) {
    throw new Error(`--slug <slug> is required (at least one)\n\n${USAGE}`);
  }
  if (dryRun && apply) {
    throw new Error(`--dry-run and --apply are mutually exclusive\n\n${USAGE}`);
  }
  if (!dryRun && !apply) {
    throw new Error(`exactly one of --dry-run or --apply is required\n\n${USAGE}`);
  }

  return { slugs, apply };
}

const STATUS_ORDER = [
  "SOURCE_MISSING",
  "MISSING",
  "MATCH",
  "BLOCKED",
  "CONFLICT",
  "ERROR",
] as const;

/** Pure dry-run report formatter — one line per slug plus summary counts. Never includes anything
 * from a B2 config/credential; the only inputs are already-in-memory canonical documents and
 * status metadata, which are game content, not secrets. */
export function formatGameCanonicalMigrationReport(
  summary: GenericCanonicalMigrationSummary,
): string {
  const lines: string[] = [];
  for (const status of summary.statuses) {
    switch (status.kind) {
      case "SOURCE_MISSING":
        lines.push(
          `SOURCE_MISSING  ${status.slug}  (no Creator canonical at this slug — check for a typo)`,
        );
        break;
      case "MISSING":
        lines.push(`MISSING         ${status.slug}  (would create)`);
        break;
      case "MATCH":
        lines.push(`MATCH           ${status.slug}  (already in sync, no-op)`);
        break;
      case "BLOCKED":
        lines.push(
          `BLOCKED         ${status.slug}  (reason: ${status.reason} — repair the Creator canonical` +
            ` itself, then re-run dry-run; retrying THIS tool will never resolve it)`,
        );
        break;
      case "CONFLICT":
        lines.push(
          `CONFLICT        ${status.slug}  (stored generic document disagrees with the current` +
            ` Creator canonical — not auto-resolved)`,
        );
        break;
      case "ERROR":
        lines.push(`ERROR           ${status.slug}  (${status.stage}: ${status.message})`);
        break;
    }
  }
  lines.push("");
  lines.push("summary: " + STATUS_ORDER.map((kind) => `${kind}=${summary.counts[kind]}`).join(" "));
  return lines.join("\n");
}

/** Pure apply-mode report formatter — same per-slug detail as {@link formatGameCanonicalMigrationReport}
 * (the classification apply started from), plus the actual write outcome for every slug. */
export function formatGameCanonicalMigrationApplyReport(
  result: GenericCanonicalMigrationApplyResult,
): string {
  const lines = [formatGameCanonicalMigrationReport(result.summary), "", "write outcomes:"];
  for (const outcome of result.outcomes) {
    switch (outcome.kind) {
      case "CREATED":
        lines.push(`CREATED               ${outcome.slug}`);
        break;
      case "SKIPPED":
        lines.push(`SKIPPED               ${outcome.slug}  (status: ${outcome.status})`);
        break;
      case "RACE_LOST":
        lines.push(
          `RACE_LOST             ${outcome.slug}  (another writer created the generic document` +
            ` between classification and save — left untouched, never overwritten)`,
        );
        break;
      case "WRITE_FAILED":
        lines.push(`WRITE_FAILED          ${outcome.slug}  (${outcome.message})`);
        break;
      case "PARITY_MISMATCH_AFTER_WRITE":
        lines.push(
          `PARITY_MISMATCH       ${outcome.slug}  (wrote successfully, but the re-read didn't match)`,
        );
        break;
    }
  }
  return lines.join("\n");
}

/**
 * The three-tier exit code contract this tool follows, modeled on
 * creator-canonical-backfill.ts's own `determineBackfillExitCode` — but with TWO deliberate
 * differences from that tool's tiering, both explained below:
 *
 *   - `0` (clean): every slug is MISSING/MATCH (dry-run), or every apply outcome is
 *     CREATED/SKIPPED-for-MATCH — nothing here needs a human right now.
 *   - `1` (fatal): an `ERROR` slug (a malformed stored document or a real storage failure — the
 *     tool itself couldn't determine the state), or, in apply mode, a `WRITE_FAILED` or
 *     `PARITY_MISMATCH_AFTER_WRITE` outcome (the write path itself misbehaved).
 *   - `2` (attention): a `CONFLICT` slug, a `BLOCKED` slug, a `SOURCE_MISSING` slug, or (apply
 *     mode) a `RACE_LOST` outcome — the tool ran correctly and made no unsafe write, but something
 *     needs a human to look.
 *
 * Difference 1 — `BLOCKED` is tier 2 here, NOT excluded from non-zero like
 * creator-canonical-backfill.ts's own BLOCKED. That tool's BLOCKED means "this D1 row's score
 * policy isn't configured yet" — an ordinary, expected, ongoing state for a Creator game an admin
 * hasn't finished configuring. THIS tool's BLOCKED means the Creator canonical converts into a
 * document that fails the generic schema's own stricter semantic invariants (see
 * gameCanonicalDocument.ts's own doc comment — an inverted score range, `score:null` +
 * `leaderboard:true`, an out-of-bounds `xpPerCompletion`) — a real, existing data problem with the
 * SOURCE canonical itself, not a routine in-progress state. Retrying this tool never resolves it;
 * an operator has to repair the Creator canonical directly, then re-run `--dry-run`. Exit 2 (not 1)
 * because the tool itself still ran correctly and made no unsafe write — the same "needs a human,
 * nothing is actually broken in this run" tier CONFLICT already uses.
 *
 * Difference 2 — `SOURCE_MISSING` is tier 2 here, with no equivalent classification in
 * creator-canonical-backfill.ts at all (that tool only ever processes rows it already knows exist,
 * enumerated from a D1 export). This tool takes explicit `--slug` values with no existence check
 * ahead of time and no B2 listing to cross-reference against (see this file's own top doc comment)
 * — so a SOURCE_MISSING result is far more likely to mean an operator typo'd the slug than that
 * they intentionally listed a not-yet-Creator-canonical game, and both cases deserve a human's
 * attention before the tool is trusted to have covered everything the operator intended. Exit 2,
 * not 1, for the same reason as BLOCKED: nothing about the tool's own run is broken.
 */
export type GameCanonicalMigrationRunOutcome =
  | { readonly mode: "dry-run"; readonly summary: GenericCanonicalMigrationSummary }
  | { readonly mode: "apply"; readonly result: GenericCanonicalMigrationApplyResult };

/** `true` when apply actually wrote something incorrectly or couldn't confirm what it wrote — the
 * two outcome kinds that mean the write path itself misbehaved, as opposed to `RACE_LOST`/
 * `SKIPPED`, which mean apply correctly declined to write. */
export function hasFatalApplyFailure(
  outcomes: readonly GenericCanonicalMigrationApplyOutcome[],
): boolean {
  return outcomes.some(
    (outcome) => outcome.kind === "WRITE_FAILED" || outcome.kind === "PARITY_MISMATCH_AFTER_WRITE",
  );
}

/** Maps a finished dry-run or apply run to this tool's process exit code — see the exit-code
 * contract doc comment just above for what each tier means and why BLOCKED/SOURCE_MISSING are
 * tier 2 here (a deliberate divergence from creator-canonical-backfill.ts's own tiering). Pure:
 * takes only the already-computed summary/result, no I/O. */
export function determineGameCanonicalMigrationExitCode(
  outcome: GameCanonicalMigrationRunOutcome,
): 0 | 1 | 2 {
  const summary = outcome.mode === "dry-run" ? outcome.summary : outcome.result.summary;
  const fatalApplyFailure =
    outcome.mode === "apply" && hasFatalApplyFailure(outcome.result.outcomes);
  if (summary.counts.ERROR > 0 || fatalApplyFailure) {
    return 1;
  }

  const raceLost =
    outcome.mode === "apply" && outcome.result.outcomes.some((o) => o.kind === "RACE_LOST");
  if (
    summary.counts.CONFLICT > 0 ||
    summary.counts.BLOCKED > 0 ||
    summary.counts.SOURCE_MISSING > 0 ||
    raceLost
  ) {
    return 2;
  }

  return 0;
}

/**
 * Wires the real B2-backed source (Creator canonical, Stage A) and destination (generic
 * canonical, Stage U-1/U-2) repositories from ONE shared `BackblazeB2GameBundleRepository`
 * instance — no second B2 client, matching B2CreatorGameDefinitionRepository's and
 * B2GameCanonicalRepository's own doc comments, and the exact same composition
 * apps/api/src/container.ts already uses for `creatorGameDefinitionRepo`/`gameCanonicalRepo`
 * (Stage U-3).
 */
export function buildGameCanonicalMigrationRepositoriesFromB2Config(b2Config: BackblazeB2Config): {
  readonly source: CreatorGameDefinitionRepository;
  readonly destination: GameCanonicalRepository;
} {
  const storage = new BackblazeB2GameBundleRepository(b2Config);
  return {
    source: new B2CreatorGameDefinitionRepository(storage),
    destination: new B2GameCanonicalRepository(storage),
  };
}

export interface GameCanonicalMigrationCliDeps {
  readonly source: CreatorGameDefinitionRepository;
  readonly destination: GameCanonicalRepository;
  readonly log: (message: string) => void;
}

/**
 * The CLI's own top-level flow — classifies (dry-run) or classifies+writes (apply) the given
 * slugs, logs the formatted report, and returns the process exit code
 * {@link determineGameCanonicalMigrationExitCode} computes for the run. The report is always
 * logged BEFORE this returns, so a caller that acts on a non-zero exit code still has the full
 * per-slug detail already printed, not just a bare number. Takes its source/destination/log
 * dependencies injected so this is testable against fake repositories, with no real B2 access —
 * the runner script (run-game-canonical-migration.ts) is the only place a real B2-backed
 * repository and `process.exitCode` itself get touched.
 */
export async function runGameCanonicalMigrationCli(
  args: GameCanonicalMigrationCliArgs,
  deps: GameCanonicalMigrationCliDeps,
): Promise<0 | 1 | 2> {
  if (!args.apply) {
    const summary = await classifyGenericCanonicalMigrationRows(
      args.slugs,
      deps.source,
      deps.destination,
    );
    deps.log(formatGameCanonicalMigrationReport(summary));
    return determineGameCanonicalMigrationExitCode({ mode: "dry-run", summary });
  }

  const result = await applyGenericCanonicalMigration(args.slugs, deps.source, deps.destination);
  deps.log(formatGameCanonicalMigrationApplyReport(result));
  return determineGameCanonicalMigrationExitCode({ mode: "apply", result });
}
