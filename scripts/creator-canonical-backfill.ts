import type { BackblazeB2Config } from "@owogg/db";
import { BackblazeB2GameBundleRepository, B2CreatorGameDefinitionRepository } from "@owogg/db";
import type {
  CreatorGameDefinitionRepository,
  SandboxGameRecordCanonicalSource,
  BackfillSummary,
  BackfillApplyResult,
} from "@owogg/core";
import { classifyBackfillRows, applyBackfill } from "@owogg/core";

/**
 * Stage B-2 of the Creator B2 Canonical Registry migration — the CLI-facing half of the
 * dry-run/apply backfill tool. All orchestration logic (classification, apply-mode writes, parity
 * re-read, the MISSING/MATCH/BLOCKED/CONFLICT/ERROR status model) lives in
 * packages/core/src/application/creatorCanonicalBackfill.ts, provider-neutral and independently
 * tested there — this file is only argv parsing, input-file shape validation, B2 config/repository
 * wiring, and output formatting. No top-level side effects (same split as
 * official-game-bundle-publisher.ts/publish-official-game-bundles.ts): every exported function here
 * is safely importable by this file's own test suite without touching a real filesystem or B2.
 * See run-creator-canonical-backfill.ts for the thin runner that actually calls `main()`.
 *
 * D1 enumeration: this tool does NOT query D1 itself — there is no existing precedent anywhere in
 * scripts/ for a live D1 connection outside a Worker (registry/verify-production.ts scripts only
 * ever hit the deployed public API over HTTP), and this migration's own task explicitly disallows
 * adding a production API endpoint or request path for it. Instead, an operator exports the
 * relevant `sandbox_games` rows to a JSON file externally (e.g.
 * `wrangler d1 execute --remote --json`) and passes that file's path via `--input`. This keeps the
 * tool itself simple, keeps production D1 access entirely out of this PR, and matches the row
 * shape {@link SandboxGameRecordCanonicalSource} already needs.
 */

export interface BackfillCliArgs {
  readonly inputPath: string;
  readonly apply: boolean;
}

const USAGE =
  "usage: tsx scripts/run-creator-canonical-backfill.ts --input <rows.json> [--apply]\n" +
  "  (no --apply: dry-run, zero B2 writes, the default and safe mode)\n" +
  "  --apply: writes MISSING rows to B2 only; MATCH/BLOCKED/CONFLICT/ERROR are always skipped.";

/** Pure argv parser — no filesystem, no env, no B2. Throws with {@link USAGE} on anything it
 * doesn't recognize, rather than guessing at operator intent. */
export function parseBackfillCliArgs(argv: readonly string[]): BackfillCliArgs {
  let inputPath: string | undefined;
  let apply = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    if (arg === "--input") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error(`--input requires a file path argument\n\n${USAGE}`);
      }
      inputPath = value;
      i++;
      continue;
    }
    throw new Error(`unrecognized argument: ${arg}\n\n${USAGE}`);
  }

  if (!inputPath) {
    throw new Error(`--input <rows.json> is required\n\n${USAGE}`);
  }

  return { inputPath, apply };
}

const REQUIRED_STRING_FIELDS = ["slug", "title", "genre", "updatedAt"] as const;
const NULLABLE_STRING_FIELDS = [
  "shortDescription",
  "description",
  "scoreUnit",
  "scoreDisplayPrefix",
  "scoreDisplaySuffix",
] as const;

function fieldError(index: number, slug: unknown, message: string): Error {
  const slugLabel = typeof slug === "string" && slug.length > 0 ? slug : "<unknown slug>";
  return new Error(`creator canonical backfill input row #${index} (${slugLabel}): ${message}`);
}

/**
 * Validates and narrows one parsed JSON row into a {@link SandboxGameRecordCanonicalSource} —
 * fail-closed: any missing/mis-typed field throws immediately rather than defaulting or coercing.
 * Only the fields the mapper actually needs are copied into the returned object — this is a
 * defense-in-depth layer on top of `mapSandboxGameRecordToCanonical`'s own `Pick`-typed signature:
 * an operator's export is realistically a full `sandbox_games` row (id, developerUserId,
 * visibility, liveVersionId, reviewSlot, deletedAt, logoKey, createdAt, ...), and none of that D1
 * identity/runtime state is even retained past this function, let alone reaches B2.
 */
function parseBackfillInputRow(raw: unknown, index: number): SandboxGameRecordCanonicalSource {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw fieldError(index, undefined, "expected a JSON object");
  }
  const row = raw as Record<string, unknown>;

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof row[field] !== "string" || row[field] === "") {
      throw fieldError(index, row.slug, `"${field}" must be a non-empty string`);
    }
  }
  for (const field of NULLABLE_STRING_FIELDS) {
    if (row[field] !== null && typeof row[field] !== "string") {
      throw fieldError(index, row.slug, `"${field}" must be a string or null`);
    }
  }
  if (row.mode !== "single" && row.mode !== "multi") {
    throw fieldError(index, row.slug, `"mode" must be "single" or "multi"`);
  }
  if (typeof row.xpPerCompletion !== "number" || !Number.isFinite(row.xpPerCompletion)) {
    throw fieldError(index, row.slug, `"xpPerCompletion" must be a finite number`);
  }
  if (
    row.scoreDirection !== "asc" &&
    row.scoreDirection !== "desc" &&
    row.scoreDirection !== null
  ) {
    throw fieldError(index, row.slug, `"scoreDirection" must be "asc", "desc", or null`);
  }
  for (const field of ["scoreMin", "scoreMax"] as const) {
    const value = row[field];
    if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
      throw fieldError(index, row.slug, `"${field}" must be a finite number or null`);
    }
  }

  return {
    slug: row.slug as string,
    title: row.title as string,
    shortDescription: row.shortDescription as string | null,
    description: row.description as string | null,
    genre: row.genre as string,
    mode: row.mode,
    xpPerCompletion: row.xpPerCompletion as number,
    scoreUnit: row.scoreUnit as string | null,
    scoreDirection: row.scoreDirection,
    scoreMin: row.scoreMin as number | null,
    scoreMax: row.scoreMax as number | null,
    scoreDisplayPrefix: row.scoreDisplayPrefix as string | null,
    scoreDisplaySuffix: row.scoreDisplaySuffix as string | null,
    updatedAt: row.updatedAt as string,
  };
}

/** Parses and validates an entire `--input` file's JSON text. Fail-closed: malformed JSON, a
 * non-array top level, or any single invalid row all throw immediately — this never returns a
 * partially-valid row list. */
export function parseBackfillInputRows(jsonText: string): SandboxGameRecordCanonicalSource[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(
      `creator canonical backfill input is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error("creator canonical backfill input must be a JSON array of row objects");
  }
  return parsed.map((raw, index) => parseBackfillInputRow(raw, index));
}

const STATUS_ORDER = ["MISSING", "MATCH", "BLOCKED", "CONFLICT", "ERROR"] as const;

/** Pure dry-run report formatter — one line per row plus summary counts. Never includes anything
 * from a B2 config/credential; the only inputs are already-in-memory canonical documents and
 * status metadata, which are game content, not secrets. */
export function formatBackfillReport(summary: BackfillSummary): string {
  const lines: string[] = [];
  for (const status of summary.statuses) {
    switch (status.kind) {
      case "MISSING":
        lines.push(`MISSING   ${status.slug}  (would create)`);
        break;
      case "MATCH":
        lines.push(`MATCH     ${status.slug}  (no-op)`);
        break;
      case "BLOCKED":
        lines.push(`BLOCKED   ${status.slug}  (reason: ${status.reason})`);
        break;
      case "CONFLICT":
        lines.push(
          `CONFLICT  ${status.slug}  (stored B2 document disagrees with the current D1 row — not auto-resolved)`,
        );
        break;
      case "ERROR":
        lines.push(`ERROR     ${status.slug}  (${status.message})`);
        break;
    }
  }
  lines.push("");
  lines.push("summary: " + STATUS_ORDER.map((kind) => `${kind}=${summary.counts[kind]}`).join(" "));
  return lines.join("\n");
}

/** Pure apply-mode report formatter — same per-row detail as {@link formatBackfillReport} (the
 * classification apply started from), plus the actual write outcome for every row. */
export function formatBackfillApplyReport(result: BackfillApplyResult): string {
  const lines = [formatBackfillReport(result.summary), "", "write outcomes:"];
  for (const outcome of result.outcomes) {
    switch (outcome.kind) {
      case "CREATED":
        lines.push(`CREATED               ${outcome.slug}`);
        break;
      case "SKIPPED":
        lines.push(`SKIPPED               ${outcome.slug}  (status: ${outcome.status})`);
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

export function buildCreatorGameDefinitionRepositoryFromB2Config(
  b2Config: BackblazeB2Config,
): CreatorGameDefinitionRepository {
  const storage = new BackblazeB2GameBundleRepository(b2Config);
  return new B2CreatorGameDefinitionRepository(storage);
}

export interface CreatorCanonicalBackfillCliDeps {
  readonly readFile: (path: string) => string;
  readonly repo: CreatorGameDefinitionRepository;
  readonly log: (message: string) => void;
}

/** The CLI's own top-level flow — reads the input file, classifies (dry-run) or classifies+writes
 * (apply), and logs the formatted report. Takes its file/repo/log dependencies injected so this is
 * testable against a fake repository and an in-memory "file", with no real fs/B2 access — the
 * runner script (run-creator-canonical-backfill.ts) is the only place real fs.readFileSync and a
 * real B2-backed repository get constructed and passed in. */
export async function runCreatorCanonicalBackfillCli(
  args: BackfillCliArgs,
  deps: CreatorCanonicalBackfillCliDeps,
): Promise<void> {
  const jsonText = deps.readFile(args.inputPath);
  const rows = parseBackfillInputRows(jsonText);

  if (!args.apply) {
    const summary = await classifyBackfillRows(rows, deps.repo);
    deps.log(formatBackfillReport(summary));
    return;
  }

  const result = await applyBackfill(rows, deps.repo);
  deps.log(formatBackfillApplyReport(result));
}
