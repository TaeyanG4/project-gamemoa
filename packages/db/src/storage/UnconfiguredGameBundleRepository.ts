import type { GameBundleStorageRepository } from "@owogg/core";

/** Wired in when Backblaze B2 credentials aren't configured for this environment yet (see the
 * B2_* secrets in apps/api/src/routes/auth.ts) — mirrors how RATE_LIMITER/Discord OAuth degrade
 * gracefully when unbound rather than crashing container construction.
 *
 * Fail-safe in both directions: writes throw loudly (upload routes already check
 * `gameBundlesConfigured` and return a clean 503 before ever reaching this, so a throw here is
 * defense in depth), while reads report "absent" so the public game-serving routes fall through to
 * their ordinary indistinguishable 404 instead of leaking a distinct "storage misconfigured"
 * signal to anonymous visitors. Provider-agnostic on purpose — this is the fallback regardless of
 * which object storage backs production. */
export class UnconfiguredGameBundleRepository implements GameBundleStorageRepository {
  async putObject(): Promise<never> {
    throw new Error("Game bundle storage is not configured for this environment");
  }
  async getObject(): Promise<null> {
    return null;
  }
  async deleteObject(): Promise<void> {
    // Nothing was ever stored — nothing to do.
  }
}
