import fs from "node:fs";
import process from "node:process";
import { readB2ConfigFromEnv } from "./official-game-bundle-publisher.js";
import {
  parseBackfillCliArgs,
  buildCreatorGameDefinitionRepositoryFromB2Config,
  runCreatorCanonicalBackfillCli,
} from "./creator-canonical-backfill.js";

/**
 * Thin runner for the Stage B-2 Creator Canonical backfill tool — argv in, exit code out. All real
 * logic lives in creator-canonical-backfill.ts (importable, no top-level side effects, its own test
 * suite); this file's only job is wiring real fs + a real B2-backed repository into it and calling
 * `main()`.
 *
 * Dry-run is the default — pass no flags and this only reads (`findBySlug`) against B2, never
 * writes. Pass `--apply` to actually create MISSING documents; see
 * creatorCanonicalBackfill.ts's (packages/core) own doc comment for the full write/parity/rollback
 * contract `--apply` follows.
 *
 * Never run this against production B2 as part of this migration Stage — see this Stage's own PR
 * description for why (tool + tests only, no real backfill executed yet).
 *
 * Exit code: 0 = clean, 1 = fatal (an ERROR row, or apply's write path itself failed), 2 =
 * needs-attention-but-not-broken (a CONFLICT row, or apply lost a create race to another writer)
 * — see determineBackfillExitCode's own doc comment (creator-canonical-backfill.ts) for the full
 * contract. A thrown error before that point (bad argv, missing B2 config, an unreadable/malformed
 * input file) is caught by `main().catch` below and always exits 1.
 */
async function main(): Promise<void> {
  const args = parseBackfillCliArgs(process.argv.slice(2));

  const b2Config = readB2ConfigFromEnv();
  if (!b2Config) {
    throw new Error(
      "B2 credentials not configured (B2_ENDPOINT/B2_REGION/B2_BUCKET_NAME/B2_KEY_ID/" +
        "B2_APPLICATION_KEY) — refusing to run.",
    );
  }

  console.log(
    args.apply
      ? `⚠️  APPLY MODE — will create B2 documents for MISSING rows only. Input: ${args.inputPath}`
      : `🔎 DRY RUN (default, zero B2 writes). Input: ${args.inputPath}`,
  );

  const repo = buildCreatorGameDefinitionRepositoryFromB2Config(b2Config);

  const exitCode = await runCreatorCanonicalBackfillCli(args, {
    readFile: (path) => fs.readFileSync(path, "utf-8"),
    repo,
    log: (message) => console.log(message),
  });

  // Set, never call process.exit() here — Node still flushes pending stdout/stderr (the report
  // just logged above) before exiting on a set exitCode, which an immediate process.exit() is not
  // guaranteed to do. See creator-canonical-backfill.ts's determineBackfillExitCode doc comment
  // for what 0/1/2 each mean; a non-zero code here must never be silently swallowed into a
  // successful exit.
  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}

main().catch((err: unknown) => {
  console.error("❌ Creator canonical backfill failed:", err);
  process.exit(1);
});
