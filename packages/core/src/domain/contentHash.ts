/**
 * SHA-256 of raw bytes, hex-encoded. Uses the Web Crypto global, which exists in both Cloudflare
 * Workers and Node 18+ — so this stays a pure function of its input with no infrastructure
 * dependency, and can live in the domain layer alongside the code that decides *what* to hash.
 *
 * This is the hash that backs the "the bytes an admin approved are the bytes served" guarantee
 * (see packages/db/migrations/0024_sandbox_games.sql's note on sandbox_game_versions): it is
 * computed by us over the bytes we received, never read back from a storage provider's own
 * metadata, so no provider bug or swap can weaken it.
 */
export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
