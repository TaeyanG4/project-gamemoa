import test from "node:test";
import assert from "node:assert/strict";
import type { GamePresentation } from "@owogg/game-sdk";
import {
  shouldShowFullscreenControl,
  resolveMobileAdvisory,
  resolveOrientationAdvisory,
} from "../features/game/presentationAdvisory";

/** Synthetic GamePresentation fixtures only — no real shipped game has one today, matching every
 * other Presentation test file's own convention. */
function presentation(overrides: Partial<GamePresentation> = {}): GamePresentation {
  return {
    viewport: { mode: "responsive" },
    fullscreen: { supported: false },
    mobile: { support: "unsupported" },
    ...overrides,
  };
}

// ── fullscreen ──────────────────────────────────────────────────────────────

test("no fullscreen control when presentation is undefined — every shipped game today", () => {
  assert.equal(shouldShowFullscreenControl(undefined, true), false);
});

test("no fullscreen control when the game doesn't support it, even if the browser can", () => {
  assert.equal(
    shouldShowFullscreenControl(presentation({ fullscreen: { supported: false } }), true),
    false,
  );
});

test("no fullscreen control when the browser can't, even if the game supports it", () => {
  assert.equal(
    shouldShowFullscreenControl(presentation({ fullscreen: { supported: true } }), false),
    false,
  );
});

test("fullscreen control shows only when both the game and the browser support it", () => {
  assert.equal(
    shouldShowFullscreenControl(presentation({ fullscreen: { supported: true } }), true),
    true,
  );
});

test("recommended has no effect on whether the control shows at all — only supported does", () => {
  assert.equal(
    shouldShowFullscreenControl(
      presentation({ fullscreen: { supported: true, recommended: true } }),
      true,
    ),
    true,
  );
  assert.equal(
    shouldShowFullscreenControl(
      presentation({ fullscreen: { supported: false, recommended: true } }),
      true,
    ),
    false,
  );
});

// ── mobile support advisory ─────────────────────────────────────────────────

test("desktop (not mobile-like) never shows a mobile warning, regardless of the game's own support value", () => {
  assert.equal(
    resolveMobileAdvisory(presentation({ mobile: { support: "unsupported" } }), false),
    "none",
  );
  assert.equal(
    resolveMobileAdvisory(presentation({ mobile: { support: "experimental" } }), false),
    "none",
  );
});

test("presentation undefined never shows a mobile warning, even in a mobile-like environment", () => {
  assert.equal(resolveMobileAdvisory(undefined, true), "none");
});

test("mobile-like + support: supported shows no advisory", () => {
  assert.equal(
    resolveMobileAdvisory(presentation({ mobile: { support: "supported" } }), true),
    "none",
  );
});

test("mobile-like + support: experimental shows the experimental advisory", () => {
  assert.equal(
    resolveMobileAdvisory(presentation({ mobile: { support: "experimental" } }), true),
    "experimental",
  );
});

test("mobile-like + support: unsupported shows the unsupported advisory", () => {
  assert.equal(
    resolveMobileAdvisory(presentation({ mobile: { support: "unsupported" } }), true),
    "unsupported",
  );
});

// ── orientation advisory ────────────────────────────────────────────────────

test("desktop (not mobile-like) never shows an orientation hint, regardless of a mismatch", () => {
  assert.deepEqual(
    resolveOrientationAdvisory(
      presentation({ mobile: { support: "supported", orientation: "landscape" } }),
      false,
      "portrait",
    ),
    { kind: "none" },
  );
});

test("orientation: any (or absent) never shows a hint, even mobile-like", () => {
  assert.deepEqual(
    resolveOrientationAdvisory(
      presentation({ mobile: { support: "supported", orientation: "any" } }),
      true,
      "portrait",
    ),
    { kind: "none" },
  );
  assert.deepEqual(
    resolveOrientationAdvisory(
      presentation({ mobile: { support: "supported" } }),
      true,
      "portrait",
    ),
    { kind: "none" },
  );
});

test("a preferred orientation matching the actual device orientation shows no hint", () => {
  assert.deepEqual(
    resolveOrientationAdvisory(
      presentation({ mobile: { support: "supported", orientation: "landscape" } }),
      true,
      "landscape",
    ),
    { kind: "none" },
  );
});

test("a preferred orientation mismatching the actual device orientation shows a hint naming the preference", () => {
  assert.deepEqual(
    resolveOrientationAdvisory(
      presentation({ mobile: { support: "supported", orientation: "landscape" } }),
      true,
      "portrait",
    ),
    { kind: "mismatch", preferred: "landscape" },
  );
  assert.deepEqual(
    resolveOrientationAdvisory(
      presentation({ mobile: { support: "supported", orientation: "portrait" } }),
      true,
      "landscape",
    ),
    { kind: "mismatch", preferred: "portrait" },
  );
});
