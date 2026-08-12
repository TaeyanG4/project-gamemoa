// Discord HTTP Interactions request signature verification (Ed25519).
// https://docs.discord.com/developers/interactions/overview
//
// Discord signs every interaction POST with the application's Ed25519 key. The signature
// covers `timestamp + rawBody` (exact bytes, before any JSON parsing). Verification MUST
// happen before the payload is trusted for anything, including replying to PING.
//
// Uses the Web Crypto API's native "Ed25519" algorithm (supported by Cloudflare Workers'
// SubtleCrypto, and by Node 22+ globalThis.crypto), so no extra dependency (e.g. tweetnacl)
// is required.

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function verifyDiscordSignature(params: {
  publicKeyHex: string;
  signatureHex: string | null | undefined;
  timestamp: string | null | undefined;
  rawBody: string;
}): Promise<boolean> {
  const { publicKeyHex, signatureHex, timestamp, rawBody } = params;
  if (!publicKeyHex || !signatureHex || !timestamp) return false;

  const publicKeyBytes = hexToBytes(publicKeyHex);
  const signatureBytes = hexToBytes(signatureHex);
  if (!publicKeyBytes || !signatureBytes) return false;

  try {
    // TS's lib.dom BufferSource typing wants Uint8Array<ArrayBuffer> specifically; our
    // hand-built byte arrays are always plain heap buffers (never SharedArrayBuffer), so
    // this cast is safe.
    const key = await crypto.subtle.importKey(
      "raw",
      publicKeyBytes as unknown as BufferSource,
      { name: "Ed25519" },
      false,
      ["verify"],
    );

    const message = new TextEncoder().encode(timestamp + rawBody);
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      key,
      signatureBytes as unknown as BufferSource,
      message,
    );
  } catch {
    // Malformed key/signature bytes, or the runtime doesn't support Ed25519 — never trust.
    return false;
  }
}
