import type { GameBundleStorageRepository } from "@owogg/core";

/**
 * ⚠️ NOT WIRED into the container as of 2026-08-16 — production sandbox game object storage is
 * Backblaze B2 (see BackblazeB2GameBundleRepository.ts), not R2, for cost-cap control (no bucket
 * ever existed under this adapter, so nothing to migrate). Kept only because it's small,
 * self-contained, and free to keep around in case R2 is reconsidered later — see
 * docs/GAME_CREATION_GUIDE.md §3.2. It is maintained for interface compatibility only: it is not
 * exported from this package's index, and no active code path constructs it. Delete this file
 * freely if it starts costing more to maintain than it's worth.
 */

/**
 * Minimal structural subset of Cloudflare's R2Bucket binding — hand-rolled rather than importing
 * `@cloudflare/workers-types` here, same reasoning as D1UserRepository.ts's local `D1Database`
 * interface: keeps this package decoupled from a Cloudflare-specific type package and easy to
 * fake in tests.
 */
export interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array,
    options?: { httpMetadata?: { contentType?: string; contentEncoding?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
  delete(key: string): Promise<void>;
}

export class R2GameBundleRepository implements GameBundleStorageRepository {
  constructor(private bucket: R2Bucket) {}

  async putObject(input: {
    key: string;
    bytes: ArrayBuffer | Uint8Array;
    contentType: string;
    contentEncoding?: string | undefined;
  }): Promise<void> {
    await this.bucket.put(input.key, input.bytes, {
      httpMetadata: {
        contentType: input.contentType,
        ...(input.contentEncoding ? { contentEncoding: input.contentEncoding } : {}),
      },
    });
  }

  async getObject(key: string): Promise<ArrayBuffer | null> {
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    return obj.arrayBuffer();
  }

  async deleteObject(key: string): Promise<void> {
    await this.bucket.delete(key);
  }
}
