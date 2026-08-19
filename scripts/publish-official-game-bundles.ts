import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  readB2ConfigFromEnv,
  publishAllMigratedGames,
  writeReleaseMap,
} from "./official-game-bundle-publisher.js";

/**
 * Builds + publishes every migrated SYSTEM game's standalone iframe bundle to
 * official-games/<slug>/<version>/ (SystemGameBundlePublisher — packages/core/src/application/
 * systemGameBundlePublisher.ts), then writes the release map
 * apps/web/app/features/game/runtime/systemGameReleaseMap.generated.ts consumes to know the exact
 * URL GameHost.tsx should iframe. Runs as its own deploy step, strictly BEFORE "Build Web
 * Frontend" — see .github/workflows/deploy.yml's "Publish Official Game Bundles" step.
 *
 * Any failure here — a build error, a missing dist/index.html, a B2 upload failure — throws,
 * caught by main().catch below, which exits non-zero. In a GitHub Actions job that stops the
 * workflow immediately: neither the release map (left as whatever it was before this run — this
 * script's own committed-empty default, or a previous successful deploy's) nor any later step
 * (Build/Deploy Web Frontend) ever runs. That is deliberate and is what makes "publish
 * failed/missing hash -> the new iframe URL is never deployed" hold structurally rather than by
 * convention. See official-game-bundle-publisher.ts for the actual build/hash/publish logic (kept
 * in its own module, with no top-level side effects, so it's importable by this script's own test
 * suite without triggering a real publish — same split as registry-builder.ts/
 * generate-game-registry.ts).
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..");

async function main(): Promise<void> {
  const b2Config = readB2ConfigFromEnv();
  if (!b2Config) {
    throw new Error(
      "B2 credentials not configured (B2_ENDPOINT/B2_REGION/B2_BUCKET_NAME/B2_KEY_ID/" +
        "B2_APPLICATION_KEY) — refusing to publish. The release map is left untouched.",
    );
  }

  const releases = await publishAllMigratedGames(REPO_ROOT, b2Config);
  writeReleaseMap(REPO_ROOT, releases);

  const mapPath = path.join(
    REPO_ROOT,
    "apps",
    "web",
    "app",
    "features",
    "game",
    "runtime",
    "systemGameReleaseMap.generated.ts",
  );
  console.log(`\n📝 Release map written: ${mapPath}`);
  for (const [slug, r] of Object.entries(releases)) {
    console.log(`   ${slug} -> ${r.version}`);
  }
}

main().catch((err: unknown) => {
  console.error("❌ Official game bundle publish failed:", err);
  process.exit(1);
});
