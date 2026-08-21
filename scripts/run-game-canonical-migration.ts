import process from "node:process";
import { readB2ConfigFromEnv } from "./official-game-bundle-builder.js";
import {
  parseGameCanonicalMigrationCliArgs,
  buildGameCanonicalMigrationRepositoriesFromB2Config,
  runGameCanonicalMigrationCli,
} from "./game-canonical-migration.js";

/**
 * Thin runner for the Stage U-4 generic canonical migration tool — argv in, exit code out. All
 * real logic lives in game-canonical-migration.ts (importable, no top-level side effects, its own
 * test suite); this file's only job is wiring real B2-backed repositories into it and calling
 * `main()`.
 *
 * Exactly one of `--dry-run`/`--apply` is required — there is no default write mode (see
 * game-canonical-migration.ts's own USAGE string). `--dry-run` only reads (`findBySlug`) against
 * B2, never writes. `--apply` writes ONLY the generic canonical objects for slugs classified
 * MISSING; see genericCanonicalMigration.ts's (packages/core) own doc comment for the full
 * write/parity/no-overwrite contract `--apply` follows.
 *
 * Never run this against production B2 as part of the U-4 Stage — see this Stage's own PR
 * description for why (tool + tests only, no real migration executed yet).
 *
 * Exit code: 0 = clean, 1 = fatal (an ERROR slug, or apply's write path itself failed), 2 =
 * needs-attention-but-not-broken (a CONFLICT/BLOCKED/SOURCE_MISSING slug, or apply lost a create
 * race to another writer) — see determineGameCanonicalMigrationExitCode's own doc comment
 * (game-canonical-migration.ts) for the full contract, including why BLOCKED and SOURCE_MISSING
 * are tier 2 here rather than excluded like creator-canonical-backfill.ts's own BLOCKED. A thrown
 * error before that point (bad argv, missing B2 config) is caught by `main().catch` below and
 * always exits 1.
 */
async function main(): Promise<void> {
  const args = parseGameCanonicalMigrationCliArgs(process.argv.slice(2));

  // Same env-var convention every other B2-backed script/route already reads
  // (B2_ENDPOINT/B2_REGION/B2_BUCKET_NAME/B2_KEY_ID/B2_APPLICATION_KEY) — see
  // readB2ConfigFromEnv's own doc comment (official-game-bundle-builder.ts). No new
  // "B2_CONFIG_MISSING" sentinel invented here: a plain, descriptive Error caught by
  // `main().catch` below (which always exits 1) is this repo's existing convention for exactly
  // this failure — run-creator-canonical-backfill.ts does the same.
  const b2Config = readB2ConfigFromEnv();
  if (!b2Config) {
    throw new Error(
      "B2 credentials not configured (B2_ENDPOINT/B2_REGION/B2_BUCKET_NAME/B2_KEY_ID/" +
        "B2_APPLICATION_KEY) — refusing to run.",
    );
  }

  console.log(
    args.apply
      ? `⚠️  APPLY MODE — writes only missing generic canonical objects. Slugs: ${args.slugs.join(", ")}`
      : `🔎 DRY RUN (READ ONLY, zero B2 writes). Slugs: ${args.slugs.join(", ")}`,
  );

  const { source, destination } = buildGameCanonicalMigrationRepositoriesFromB2Config(b2Config);

  const exitCode = await runGameCanonicalMigrationCli(args, {
    source,
    destination,
    log: (message) => console.log(message),
  });

  // Set, never call process.exit() here — Node still flushes pending stdout/stderr (the report
  // just logged above) before exiting on a set exitCode, which an immediate process.exit() is not
  // guaranteed to do. See game-canonical-migration.ts's determineGameCanonicalMigrationExitCode
  // doc comment for what 0/1/2 each mean; a non-zero code here must never be silently swallowed
  // into a successful exit.
  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}

main().catch((err: unknown) => {
  console.error("❌ Generic canonical migration failed:", err);
  process.exit(1);
});
