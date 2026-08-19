/**
 * Deterministically corrupts a base64url-encoded signature — the test-only replacement for the
 * `segment.slice(0, -1) + (segment.endsWith("A") ? "B" : "A")` pattern that used to be hand-rolled
 * at each call site (packages/core/test/gameSession.test.ts, gameAttemptUseCases.test.ts,
 * creatorScoreAcceptanceUseCases.test.ts; apps/api/test/creatorScoreAccept.test.ts keeps its own
 * copy — see that file's own comment for why it isn't imported across the package boundary).
 *
 * That pattern was flaky, not just ugly: HMAC-SHA256 produces 32 bytes, which isn't a multiple of
 * 3, so base64url's LAST character encodes only 2 significant bits — the other 4 are padding bits
 * `atob`/`crypto.subtle` ignore entirely on decode. That means groups of 16 different base64url
 * characters all decode to the exact same 2-bit value in that final position. Swapping the last
 * character for a fixed replacement ("A" or "B") only actually changes the signature's real BYTES
 * when the original character happens to fall in a different such group — otherwise the "tampered"
 * signature decodes to byte-identical bytes and verification incorrectly passes. Since
 * gameSession.ts's payloads include a live `Date.now()`-derived `exp`, the real signature (and
 * therefore its last character) differs on every run, so this was a genuine ~1-in-4-runs flake, not
 * a hypothetical one — see .claude memory "flaky-tampered-token-tests" for the CI incidents this
 * traces back to.
 *
 * The fix operates on the actual DECODED bytes instead of the encoded string: flipping one real
 * byte via XOR is guaranteed to produce a different byte every time, so the re-encoded signature is
 * *always* genuinely different from the original — deterministic, not probabilistic. This changes
 * only how the TEST constructs a bad signature; verifyGameSession's own HMAC verify logic
 * (packages/core/src/domain/gameSession.ts) is untouched, and a token tampered this way must still
 * — and does — come back as BAD_SIGNATURE / INVALID_TOKEN exactly as before.
 */
export function tamperBase64UrlSegment(segment: string): string {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(withPadding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  if (bytes.length === 0) {
    // Nothing to flip a bit of — fall back to a literal change so this never silently returns the
    // same (empty) value. Not a real code path for a genuine HMAC-SHA256 signature (always 32
    // bytes), only a defensive floor for this helper's own contract.
    return `${segment}x`;
  }

  // Flip the last byte's low bit — XOR with 1 always differs from the original value, unlike a
  // character-level swap, which base64's encoding can silently absorb (see this file's own doc
  // comment). WHERE in the signature the change lands doesn't matter for what these tests need:
  // any single-bit difference anywhere in a 32-byte HMAC output makes the whole signature invalid.
  const lastIndex = bytes.length - 1;
  bytes[lastIndex] = (bytes[lastIndex] ?? 0) ^ 0x01;

  let tamperedBinary = "";
  for (let i = 0; i < bytes.length; i++) tamperedBinary += String.fromCharCode(bytes[i] ?? 0);
  return btoa(tamperedBinary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Tampers a signed token's SIGNATURE segment specifically — the part after the last "." — leaving
 * every earlier segment (version tag, payload) untouched. Every gameSession.ts-signed token has the
 * shape `<version>.<payload>.<signature>`, so this is the drop-in replacement for the old
 * `token.slice(0, -1) + (token.endsWith("A") ? "B" : "A")` one-liner at each call site: same
 * intent ("produce a token whose signature no longer matches"), deterministic instead of flaky. */
export function tamperSignedToken(token: string): string {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return tamperBase64UrlSegment(token);
  return token.slice(0, lastDot + 1) + tamperBase64UrlSegment(token.slice(lastDot + 1));
}
