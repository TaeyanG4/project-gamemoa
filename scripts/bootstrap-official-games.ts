import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { buildOfficialGameBundles, readB2ConfigFromEnv } from "./official-game-bundle-builder.js";
import {
  createOfficialGenericBundleConsumer,
  resolveOfficialD1ExecutionTarget,
} from "./official-game-bootstrap.js";
import { assertOfficialGameBootstrapTargets } from "./staging-contract.js";

/**
 * Builds every OWOGG standalone iframe bundle deterministically and converges it into generic D1
 * identity/version plus B2 canonical and games/<gameId>/<versionId> storage. Runs strictly before
 * the Web build so an incomplete generic bootstrap fails the deployment closed.
 *
 * Any failure here — a build error, a missing dist/index.html, a B2 upload failure — throws,
 * caught by main().catch below, which exits non-zero. In a GitHub Actions job that stops the
 * workflow immediately, so no later Web build/deploy runs against incomplete generic state. See
 * official-game-bundle-builder.ts for deterministic build/hash/validation and
 * official-game-bootstrap.ts for staged D1/B2 convergence.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, "..");

async function main(): Promise<void> {
  const deployment = assertOfficialGameBootstrapTargets(process.env);
  const d1Target = resolveOfficialD1ExecutionTarget(process.env, deployment);
  const b2Config = readB2ConfigFromEnv();
  if (!b2Config) {
    throw new Error(
      "B2 credentials not configured (B2_ENDPOINT/B2_REGION/B2_BUCKET_NAME/B2_KEY_ID/" +
        "B2_APPLICATION_KEY) — refusing to bootstrap official generic games.",
    );
  }

  await buildOfficialGameBundles(
    REPO_ROOT,
    createOfficialGenericBundleConsumer({ repoRoot: REPO_ROOT, b2Config, d1Target }),
  );
}

main().catch((err: unknown) => {
  console.error("❌ Official generic bootstrap failed:", err);
  process.exit(1);
});
