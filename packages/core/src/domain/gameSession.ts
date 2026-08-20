/**
 * Short-lived, HMAC-signed Game Session token used by the provider-neutral score acceptance path.
 *
 * A session ties one authenticated user to one specific game's live version, canonical difficulty,
 * and one play attempt, for a few minutes, entirely statelessly — no DB row, no server-side session store (see
 * docs/GAME_CREATION_GUIDE.md's non-goals on server-side game-state relay for the same reasoning
 * applied here: a signed, self-verifying token is the whole mechanism). Verifying a token only
 * ever needs the same secret that signed it — the same "Worker secret, no new binding
 * infrastructure" posture as ADMIN_PASSWORD_PBKDF2/DISCORD_PUBLIC_KEY (see
 * apps/api/src/routes/auth.ts's ApiEnv.Bindings).
 *
 * Hand-rolled rather than a JWT library, matching this codebase's existing precedent (the Game
 * Bridge protocol in packages/game-sdk/src/bridge/protocol.ts, sandboxGameBundle.ts's validators)
 * for the same reason: the payload is small and fixed-shape, and a library would be a dependency
 * for something Web Crypto covers directly in under a hundred lines — portable to both the
 * Cloudflare Workers runtime and the plain-Node test runner (same crypto.subtle API in both, see
 * apps/api/src/auth/adminPassword.ts, already proven this way for admin password hashing).
 *
 * Token shape: `gs1.<base64url(JSON payload)>.<base64url(HMAC-SHA256 signature)>` — the signature
 * covers `gs1.<payload>` (the version tag included), so a token can never be replayed under a
 * different version tag than the one it was actually signed under.
 */

export interface GameSessionPayload {
  readonly userId: number;
  readonly gameId: number;
  readonly versionId: number;
  /** A random per-attempt identifier (crypto.randomUUID() at issuance) — distinguishes concurrent
   * or repeated play attempts by the same user on the same game version; the generic score
   * acceptance repository consumes it atomically so it cannot be spent twice. */
  readonly attemptId: string;
  /** Unix seconds. */
  readonly exp: number;
  /** Canonical difficulty tier selected for this attempt. The score acceptance path verifies the
   * same value against the canonical policy instead of trusting a later request field. */
  readonly difficulty: string;
}

/** 5 minutes — well inside the "5~10분" the task called for, and short enough that a leaked token
 * is only ever useful very briefly. */
export const GAME_SESSION_POLICY = {
  EXPIRY_SECONDS: 300,
} as const;

const TOKEN_VERSION = "gs1";

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] ?? 0);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
    const binary = atob(withPadding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

async function importHmacKey(secret: string, usages: readonly KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages as KeyUsage[],
  );
}

function isGameSessionPayload(value: unknown): value is GameSessionPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.userId === "number" &&
    Number.isFinite(v.userId) &&
    typeof v.gameId === "number" &&
    Number.isFinite(v.gameId) &&
    typeof v.versionId === "number" &&
    Number.isFinite(v.versionId) &&
    typeof v.attemptId === "string" &&
    v.attemptId.length > 0 &&
    typeof v.exp === "number" &&
    Number.isFinite(v.exp) &&
    typeof v.difficulty === "string" &&
    v.difficulty.length > 0 &&
    v.difficulty === v.difficulty.trim()
  );
}

/** Signs a Game Session payload. `secret` is the raw GAME_SESSION_SECRET Worker secret value. */
export async function signGameSession(
  payload: GameSessionPayload,
  secret: string,
): Promise<string> {
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${TOKEN_VERSION}.${encodedPayload}`;
  const key = await importHmacKey(secret, ["sign"]);
  const signatureBytes = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput)),
  );
  return `${signingInput}.${bytesToBase64Url(signatureBytes)}`;
}

export type GameSessionVerifyError = "MALFORMED" | "BAD_SIGNATURE" | "EXPIRED";

export type GameSessionVerifyResult =
  { ok: true; payload: GameSessionPayload } | { ok: false; error: GameSessionVerifyError };

/**
 * Verifies a token's signature and expiry, and returns its payload. Does NOT check the payload
 * against any particular expected user/game/version — that is a separate concern a caller applies
 * with {@link gameSessionMatches} once it knows what it expects the token to say. Never throws:
 * any malformed input (wrong shape, undecodable base64, bad JSON, wrong field types) resolves to
 * `{ ok: false, error: "MALFORMED" }`, matching this codebase's "untrusted input is rejected
 * silently, never thrown" posture elsewhere (see packages/game-sdk/src/bridge/protocol.ts).
 */
export async function verifyGameSession(
  token: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<GameSessionVerifyResult> {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) return { ok: false, error: "MALFORMED" };
  const [, encodedPayload, encodedSignature] = parts;

  const payloadBytes = base64UrlToBytes(encodedPayload ?? "");
  const signatureBytes = base64UrlToBytes(encodedSignature ?? "");
  if (!payloadBytes || !signatureBytes) return { ok: false, error: "MALFORMED" };

  const signingInput = `${TOKEN_VERSION}.${encodedPayload}`;
  const key = await importHmacKey(secret, ["verify"]);
  // crypto.subtle.verify is a constant-time comparison internally — no hand-rolled timing-safe
  // compare needed here, unlike adminPassword.ts's PBKDF2 hash (which has no built-in verify).
  const signatureValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes.slice().buffer as ArrayBuffer,
    new TextEncoder().encode(signingInput),
  );
  if (!signatureValid) return { ok: false, error: "BAD_SIGNATURE" };

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    return { ok: false, error: "MALFORMED" };
  }
  if (!isGameSessionPayload(parsedPayload)) return { ok: false, error: "MALFORMED" };
  if (parsedPayload.exp <= nowSeconds) return { ok: false, error: "EXPIRED" };

  return { ok: true, payload: parsedPayload };
}

/**
 * Confirms an already-verified token's payload actually matches the context it's about to be used
 * in — e.g. "this session was issued to the user making this request, for the game/version this
 * request is about." A verified-but-mismatched token (right signature, wrong claims — e.g. reused
 * on a different game or replayed by a different logged-in user) must be rejected the same way an
 * invalid one is; verifyGameSession alone cannot know what a caller expects.
 */
export function gameSessionMatches(
  payload: GameSessionPayload,
  expected: { userId: number; gameId: number; versionId: number; difficulty?: string },
): boolean {
  return (
    payload.userId === expected.userId &&
    payload.gameId === expected.gameId &&
    payload.versionId === expected.versionId &&
    (expected.difficulty === undefined || payload.difficulty === expected.difficulty)
  );
}
