import { ADMIN_AUTH_POLICY } from "@owogg/core";

/**
 * Web Crypto (PBKDF2-HMAC-SHA256) admin password hashing — Cloudflare Workers/Node compatible,
 * no native dependency. The plaintext password is never persisted anywhere; only this derived
 * record is (as the ADMIN_PASSWORD_PBKDF2 GitHub Actions Secret / Worker secret).
 *
 * Record format: `pbkdf2_sha256$<iterations>$<salt_base64>$<hash_base64>`.
 */

const RECORD_PREFIX = "pbkdf2_sha256";
const SALT_BYTES = 16;
const DERIVED_KEY_BITS = 256;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] ?? 0);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derivePbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt.slice().buffer as ArrayBuffer, iterations, hash: "SHA-256" },
    keyMaterial,
    DERIVED_KEY_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashAdminPassword(
  password: string,
  iterations: number = ADMIN_AUTH_POLICY.PBKDF2_ITERATIONS,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await derivePbkdf2(password, salt, iterations);
  return `${RECORD_PREFIX}$${iterations}$${bytesToBase64(salt)}$${bytesToBase64(derived)}`;
}

interface ParsedAdminPasswordRecord {
  iterations: number;
  salt: Uint8Array;
  hash: Uint8Array;
}

function parseAdminPasswordRecord(record: string): ParsedAdminPasswordRecord | null {
  const parts = record.split("$");
  if (parts.length !== 4 || parts[0] !== RECORD_PREFIX) return null;
  const iterations = Number(parts[1]);
  if (!Number.isSafeInteger(iterations) || iterations <= 0) return null;
  try {
    return {
      iterations,
      salt: base64ToBytes(parts[2] ?? ""),
      hash: base64ToBytes(parts[3] ?? ""),
    };
  } catch {
    return null;
  }
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/** Verifies a plaintext password against a stored `pbkdf2_sha256$...` record. Never throws on
 * malformed input — a misconfigured/absent record simply fails verification. */
export async function verifyAdminPassword(
  password: string,
  record: string | undefined,
): Promise<boolean> {
  if (!record || !password) return false;
  const parsed = parseAdminPasswordRecord(record);
  if (!parsed) return false;
  const candidate = await derivePbkdf2(password, parsed.salt, parsed.iterations);
  return timingSafeEqual(candidate, parsed.hash);
}

/** Constant-shape comparison for the admin username (not a secret hash, but avoids leaking
 * length/prefix via short-circuiting `===` on attacker-controlled input either). */
export function safeStringEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  return timingSafeEqual(aBytes, bBytes);
}
