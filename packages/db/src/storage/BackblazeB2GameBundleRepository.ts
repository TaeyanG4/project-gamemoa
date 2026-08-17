import { AwsClient } from "aws4fetch";
import type { GameBundleStorageRepository } from "@owogg/core";

/**
 * Production sandbox-game object storage (2026-08-16 decision — see
 * docs/GAME_CREATION_GUIDE.md §3.2). Chosen over Cloudflare R2 specifically for its Caps/Alerts
 * cost-control primitives: an Application Key scoped to one bucket with a hard spending/storage
 * cap bounds the worst case from a buggy or malicious upload loop in a way R2 (as of this
 * decision) does not offer as directly. This adapter is the *only* place in the codebase that
 * knows Backblaze exists — everything above `GameBundleStorageRepository` is provider-neutral, and
 * key layout is decided in core (domain/sandboxGameBundle.ts), never here.
 *
 * Uses aws4fetch (~5KB, Workers-native, Web-Crypto-based SigV4 signing) against B2's
 * S3-compatible API — deliberately not the full AWS SDK (Node-oriented, far too heavy for a
 * Workers bundle) and not a hand-rolled SigV4 implementation (correctness/security risk not
 * worth taking on for something a small, audited library already solves).
 *
 * The bucket is private: these credentials never reach a browser, and players never talk to B2
 * directly — every read goes through the Worker, which is also what puts Cloudflare's cache in
 * front of B2 (see docs/GAME_CREATION_GUIDE.md §3.8).
 */
export interface BackblazeB2Config {
  /** e.g. "https://s3.us-west-004.backblazeb2.com" — from the bucket's "Endpoint" field in the
   * B2 dashboard. No trailing slash required (stripped if present). */
  endpoint: string;
  /** e.g. "us-west-004" — the region segment of the endpoint above. Kept as an explicit,
   * separately-configured value rather than parsed out of `endpoint` so a future change to
   * Backblaze's endpoint hostname format can't silently break signing. */
  region: string;
  bucket: string;
  keyId: string;
  applicationKey: string;
}

/**
 * aws4fetch defaults to `retries: 10` with a doubling backoff, which sleeps for up to ~25 seconds
 * inside a single call before giving up. That is badly wrong for both of this adapter's callers: a
 * player waiting on an asset would sit through it, and a publish walks hundreds of files, so one
 * flaky object could stall the whole request past a Worker's limits.
 *
 * Two quick retries instead. A transient 5xx/429 still recovers, while a genuine outage fails fast —
 * which is safe here because failure is never destructive: a failed publish is recorded on the
 * version and can be retried with republishVersion, and a failed read is just a 404 to the player.
 */
const B2_RETRIES = 2;
const B2_INITIAL_RETRY_MS = 50;

export class BackblazeB2GameBundleRepository implements GameBundleStorageRepository {
  private client: AwsClient;
  private endpoint: string;

  constructor(private config: BackblazeB2Config) {
    this.client = new AwsClient({
      accessKeyId: config.keyId,
      secretAccessKey: config.applicationKey,
      service: "s3",
      region: config.region,
      retries: B2_RETRIES,
      initRetryMs: B2_INITIAL_RETRY_MS,
    });
    this.endpoint = config.endpoint.replace(/\/+$/, "");
  }

  /** Each path segment is encoded individually: `encodeURIComponent` would escape the separators
   * of a nested key like `games/1/2/Build/game.wasm`, and leaving it unencoded would break on
   * spaces or non-ASCII filenames that engines occasionally emit. */
  private objectUrl(key: string): string {
    const encoded = key.split("/").map(encodeURIComponent).join("/");
    return `${this.endpoint}/${this.config.bucket}/${encoded}`;
  }

  async putObject(input: {
    key: string;
    bytes: ArrayBuffer | Uint8Array;
    contentType: string;
    contentEncoding?: string | undefined;
  }): Promise<void> {
    const headers: Record<string, string> = { "Content-Type": input.contentType };
    if (input.contentEncoding) headers["Content-Encoding"] = input.contentEncoding;

    // Normalized to a plain ArrayBuffer: a Uint8Array view isn't accepted by every BodyInit
    // typing in play across this workspace's mixed DOM + workers-types lib set, and a *view* of a
    // larger buffer (which fflate's entries are) must not be sent as its whole backing buffer.
    const body =
      input.bytes instanceof Uint8Array
        ? (input.bytes.buffer.slice(
            input.bytes.byteOffset,
            input.bytes.byteOffset + input.bytes.byteLength,
          ) as ArrayBuffer)
        : input.bytes;

    const res = await this.client.fetch(this.objectUrl(input.key), {
      method: "PUT",
      body,
      headers,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Backblaze B2 upload failed: HTTP ${res.status} ${detail}`.trim());
    }
  }

  async getObject(key: string): Promise<ArrayBuffer | null> {
    const res = await this.client.fetch(this.objectUrl(key), { method: "GET" });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Backblaze B2 download failed: HTTP ${res.status}`);
    }
    return res.arrayBuffer();
  }

  async deleteObject(key: string): Promise<void> {
    const res = await this.client.fetch(this.objectUrl(key), { method: "DELETE" });
    // A 404 here means the object is already gone — treated as success, not an error, since the
    // caller's goal ("this object no longer exists") is already satisfied.
    if (!res.ok && res.status !== 404) {
      throw new Error(`Backblaze B2 delete failed: HTTP ${res.status}`);
    }
  }
}
