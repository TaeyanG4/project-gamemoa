import test from "node:test";
import assert from "node:assert/strict";
import {
  CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
  creatorGameDefinitionObjectKey,
  serializeCreatorGameCanonicalDocument,
  parseCreatorGameCanonicalDocument,
  CreatorGameCanonicalDocumentError,
  type CreatorGameCanonicalDocument,
} from "../src/domain/creatorGameCanonicalDocument.js";

/**
 * Pure domain coverage for the Creator canonical document — key layout, serialize/parse
 * round-trip, and every fail-closed condition the B2 adapter relies on this module to enforce
 * (see B2CreatorGameDefinitionRepository.test.ts, packages/db, for the adapter-level tests that
 * build on top of this). No B2, no network, no D1 — plain strings in, plain values out.
 */

function validDocument(
  overrides: Partial<CreatorGameCanonicalDocument> = {},
): CreatorGameCanonicalDocument {
  return {
    schemaVersion: CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
    slug: "my-cool-game",
    title: "My Cool Game",
    shortDescription: "A short description",
    description: "A longer description of the game.",
    genre: "puzzle",
    mode: "single",
    policy: {
      score: { unit: "pts", direction: "desc", min: 0, max: 1000 },
      leaderboard: true,
      xpPerCompletion: 0,
      requiresAuth: false,
    },
    updatedAt: "2026-08-20T00:00:00.000Z",
    ...overrides,
  };
}

// ── key layout ─────────────────────────────────────────────────────────────

test("creatorGameDefinitionObjectKey is deterministic and slug-keyed", () => {
  assert.equal(
    creatorGameDefinitionObjectKey("my-cool-game"),
    "creator-games/my-cool-game/definition.json",
  );
  assert.equal(
    creatorGameDefinitionObjectKey("my-cool-game"),
    creatorGameDefinitionObjectKey("my-cool-game"),
  );
});

test("creatorGameDefinitionObjectKey never collides with bundle storage's own prefixes", () => {
  const key = creatorGameDefinitionObjectKey("some-slug");
  assert.ok(!key.startsWith("games/"), "must not collide with publishedObjectKey's prefix");
  assert.ok(!key.startsWith("uploads/"), "must not collide with sourceArchiveObjectKey's prefix");
});

// ── serialize / parse round trip ────────────────────────────────────────────

test("a valid document round-trips through serialize -> parse unchanged", () => {
  const original = validDocument();
  const jsonText = serializeCreatorGameCanonicalDocument(original);
  const parsed = parseCreatorGameCanonicalDocument(jsonText, original.slug);
  assert.deepEqual(parsed, original);
});

test("round-trips with presentation present and with score: null", () => {
  const withPresentation = validDocument({
    presentation: {
      viewport: { mode: "responsive" },
      fullscreen: { supported: false },
      mobile: { support: "unsupported" },
    },
  });
  const parsed1 = parseCreatorGameCanonicalDocument(
    serializeCreatorGameCanonicalDocument(withPresentation),
    withPresentation.slug,
  );
  assert.deepEqual(parsed1, withPresentation);

  const unscored = validDocument({
    policy: { score: null, leaderboard: false, xpPerCompletion: 0, requiresAuth: false },
  });
  const parsed2 = parseCreatorGameCanonicalDocument(
    serializeCreatorGameCanonicalDocument(unscored),
    unscored.slug,
  );
  assert.deepEqual(parsed2, unscored);
});

// ── fail-closed: malformed JSON ─────────────────────────────────────────────

test("malformed JSON fails closed with MALFORMED_JSON, never a default document", () => {
  assert.throws(
    () => parseCreatorGameCanonicalDocument("{not valid json", "my-cool-game"),
    (err: unknown) =>
      err instanceof CreatorGameCanonicalDocumentError && err.code === "MALFORMED_JSON",
  );
});

test("a JSON array or primitive at the top level fails closed with INVALID_DOCUMENT", () => {
  assert.throws(
    () => parseCreatorGameCanonicalDocument("[]", "my-cool-game"),
    (err: unknown) =>
      err instanceof CreatorGameCanonicalDocumentError && err.code === "INVALID_DOCUMENT",
  );
  assert.throws(
    () => parseCreatorGameCanonicalDocument("42", "my-cool-game"),
    (err: unknown) =>
      err instanceof CreatorGameCanonicalDocumentError && err.code === "INVALID_DOCUMENT",
  );
});

// ── fail-closed: unsupported schema version ─────────────────────────────────

test("an unsupported schemaVersion fails closed, never silently coerced", () => {
  const raw = { ...validDocument(), schemaVersion: 2 };
  assert.throws(
    () => parseCreatorGameCanonicalDocument(JSON.stringify(raw), raw.slug),
    (err: unknown) =>
      err instanceof CreatorGameCanonicalDocumentError && err.code === "UNSUPPORTED_SCHEMA_VERSION",
  );
});

test("a missing schemaVersion fails closed the same way as an unsupported one", () => {
  const raw: Record<string, unknown> = { ...validDocument() };
  delete raw.schemaVersion;
  assert.throws(
    () => parseCreatorGameCanonicalDocument(JSON.stringify(raw), "my-cool-game"),
    (err: unknown) =>
      err instanceof CreatorGameCanonicalDocumentError && err.code === "UNSUPPORTED_SCHEMA_VERSION",
  );
});

// ── fail-closed: slug mismatch ──────────────────────────────────────────────

test("a stored slug that doesn't match the requested slug fails closed with SLUG_MISMATCH", () => {
  const doc = validDocument({ slug: "actual-slug" });
  assert.throws(
    () =>
      parseCreatorGameCanonicalDocument(
        serializeCreatorGameCanonicalDocument(doc),
        "requested-slug",
      ),
    (err: unknown) =>
      err instanceof CreatorGameCanonicalDocumentError && err.code === "SLUG_MISMATCH",
  );
});

// ── fail-closed: invalid document shape ─────────────────────────────────────

test("a document that isn't a CREATOR canonical shape at all fails closed with INVALID_DOCUMENT", () => {
  // Something structurally unrelated — e.g. a stray GameManifest-shaped object — carrying the
  // right schemaVersion (a separate test already covers a missing/wrong one) but none of the
  // fields an actual canonical document requires.
  const notACanonicalDocument = {
    schemaVersion: CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
    id: "x",
    slug: "x",
    title: "x",
  };
  assert.throws(
    () => parseCreatorGameCanonicalDocument(JSON.stringify(notACanonicalDocument), "x"),
    (err: unknown) =>
      err instanceof CreatorGameCanonicalDocumentError && err.code === "INVALID_DOCUMENT",
  );
});

test("a missing required field fails closed with INVALID_DOCUMENT, naming the field", () => {
  const raw: Record<string, unknown> = { ...validDocument() };
  delete raw.title;
  assert.throws(
    () => parseCreatorGameCanonicalDocument(JSON.stringify(raw), "my-cool-game"),
    (err: unknown) =>
      err instanceof CreatorGameCanonicalDocumentError &&
      err.code === "INVALID_DOCUMENT" &&
      err.message.includes("title"),
  );
});

test("an invalid mode value fails closed with INVALID_DOCUMENT", () => {
  const raw = { ...validDocument(), mode: "co-op" };
  assert.throws(
    () => parseCreatorGameCanonicalDocument(JSON.stringify(raw), raw.slug),
    (err: unknown) =>
      err instanceof CreatorGameCanonicalDocumentError && err.code === "INVALID_DOCUMENT",
  );
});

test("policy missing entirely fails closed with INVALID_DOCUMENT", () => {
  const raw: Record<string, unknown> = { ...validDocument() };
  delete raw.policy;
  assert.throws(
    () => parseCreatorGameCanonicalDocument(JSON.stringify(raw), "my-cool-game"),
    (err: unknown) =>
      err instanceof CreatorGameCanonicalDocumentError &&
      err.code === "INVALID_DOCUMENT" &&
      err.message.includes("policy"),
  );
});

test("policy.score missing entirely (not even null) fails closed — score must be explicit", () => {
  const doc = validDocument();
  const raw = {
    ...doc,
    policy: { leaderboard: doc.policy.leaderboard, xpPerCompletion: 0, requiresAuth: false },
  };
  assert.throws(
    () => parseCreatorGameCanonicalDocument(JSON.stringify(raw), raw.slug),
    (err: unknown) =>
      err instanceof CreatorGameCanonicalDocumentError && err.code === "INVALID_DOCUMENT",
  );
});

test("an invalid score direction fails closed with INVALID_DOCUMENT", () => {
  const doc = validDocument({
    policy: {
      score: { unit: "pts", direction: "sideways" as never, min: 0, max: 10 },
      leaderboard: true,
      xpPerCompletion: 0,
      requiresAuth: false,
    },
  });
  assert.throws(
    () => parseCreatorGameCanonicalDocument(JSON.stringify(doc), doc.slug),
    (err: unknown) =>
      err instanceof CreatorGameCanonicalDocumentError && err.code === "INVALID_DOCUMENT",
  );
});

test("a presentation field that isn't an object fails closed with INVALID_DOCUMENT", () => {
  const raw = { ...validDocument(), presentation: "not an object" };
  assert.throws(
    () => parseCreatorGameCanonicalDocument(JSON.stringify(raw), raw.slug),
    (err: unknown) =>
      err instanceof CreatorGameCanonicalDocumentError && err.code === "INVALID_DOCUMENT",
  );
});

// ── presentation: deep validation ───────────────────────────────────────────
//
// Fail-closed shape validation matching scripts/game-registry-schema.ts's own semantics — see
// creatorGameCanonicalDocument.ts's own "presentation" section for why this is a second,
// independent implementation rather than a shared import.

function rejects(raw: unknown, expectedSlug = "my-cool-game"): void {
  assert.throws(
    () => parseCreatorGameCanonicalDocument(JSON.stringify(raw), expectedSlug),
    (err: unknown) =>
      err instanceof CreatorGameCanonicalDocumentError && err.code === "INVALID_DOCUMENT",
  );
}

test("presentation: {} rejects — viewport/fullscreen/mobile are all required once presentation is present at all", () => {
  rejects({ ...validDocument(), presentation: {} });
});

test("an invalid viewport.mode fails closed", () => {
  rejects({
    ...validDocument(),
    presentation: {
      viewport: { mode: "garbage" },
      fullscreen: { supported: false },
      mobile: { support: "unsupported" },
    },
  });
});

test("fixed mode without both preferred dimensions fails closed", () => {
  rejects({
    ...validDocument(),
    presentation: {
      viewport: { mode: "fixed" },
      fullscreen: { supported: false },
      mobile: { support: "unsupported" },
    },
  });
  rejects({
    ...validDocument(),
    presentation: {
      viewport: { mode: "fixed", preferredWidth: 640 },
      fullscreen: { supported: false },
      mobile: { support: "unsupported" },
    },
  });
});

test("a non-positive or non-finite viewport dimension fails closed", () => {
  for (const bad of [0, -100, NaN, Infinity]) {
    rejects({
      ...validDocument(),
      presentation: {
        viewport: { mode: "responsive", minWidth: bad },
        fullscreen: { supported: false },
        mobile: { support: "unsupported" },
      },
    });
  }
});

test("minWidth > maxWidth (or minHeight > maxHeight) fails closed", () => {
  rejects({
    ...validDocument(),
    presentation: {
      viewport: { mode: "responsive", minWidth: 1000, maxWidth: 500 },
      fullscreen: { supported: false },
      mobile: { support: "unsupported" },
    },
  });
  rejects({
    ...validDocument(),
    presentation: {
      viewport: { mode: "responsive", minHeight: 1000, maxHeight: 500 },
      fullscreen: { supported: false },
      mobile: { support: "unsupported" },
    },
  });
});

test("fullscreen.recommended: true with supported: false fails closed", () => {
  rejects({
    ...validDocument(),
    presentation: {
      viewport: { mode: "responsive" },
      fullscreen: { supported: false, recommended: true },
      mobile: { support: "unsupported" },
    },
  });
});

test("an invalid mobile.support value fails closed", () => {
  rejects({
    ...validDocument(),
    presentation: {
      viewport: { mode: "responsive" },
      fullscreen: { supported: false },
      mobile: { support: "great" },
    },
  });
});

test("an invalid mobile.orientation value fails closed", () => {
  rejects({
    ...validDocument(),
    presentation: {
      viewport: { mode: "responsive" },
      fullscreen: { supported: false },
      mobile: { support: "supported", orientation: "diagonal" },
    },
  });
});

test("a fully valid presentation still round-trips after adding deep validation", () => {
  const doc = validDocument({
    presentation: {
      viewport: { mode: "fixed", preferredWidth: 1280, preferredHeight: 720 },
      fullscreen: { supported: true, recommended: true },
      mobile: { support: "experimental", orientation: "landscape" },
    },
  });
  const parsed = parseCreatorGameCanonicalDocument(
    serializeCreatorGameCanonicalDocument(doc),
    doc.slug,
  );
  assert.deepEqual(parsed, doc);
});

// ── unknown-key rejection ────────────────────────────────────────────────────

test("an unknown top-level field fails closed with INVALID_DOCUMENT", () => {
  const raw: Record<string, unknown> = { ...validDocument() };
  raw.titel = "typo";
  rejects(raw);
});

test("an unknown policy field fails closed", () => {
  const doc = validDocument();
  rejects({ ...doc, policy: { ...doc.policy, unexpectedField: true } });
});

test("an unknown policy.score field fails closed", () => {
  const doc = validDocument();
  rejects({
    ...doc,
    policy: { ...doc.policy, score: { ...doc.policy.score, unexpectedField: true } },
  });
});

test("an unknown presentation field fails closed", () => {
  rejects({
    ...validDocument(),
    presentation: {
      viewport: { mode: "responsive" },
      fullscreen: { supported: false },
      mobile: { support: "unsupported" },
      futureField: true,
    },
  });
});

test("an unknown nested field in viewport/fullscreen/mobile each fails closed", () => {
  const base = {
    viewport: { mode: "responsive" as const },
    fullscreen: { supported: false },
    mobile: { support: "unsupported" as const },
  };
  rejects({
    ...validDocument(),
    presentation: { ...base, viewport: { ...base.viewport, aspectRatio: "16:9" } },
  });
  rejects({
    ...validDocument(),
    presentation: { ...base, fullscreen: { ...base.fullscreen, required: true } },
  });
  rejects({
    ...validDocument(),
    presentation: { ...base, mobile: { ...base.mobile, controlsScheme: "virtual-joystick" } },
  });
});
