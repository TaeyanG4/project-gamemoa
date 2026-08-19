import test from "node:test";
import assert from "node:assert/strict";
import {
  mapSandboxGameRecordToCanonical,
  type SandboxGameRecordCanonicalSource,
} from "../src/domain/creatorGameCanonicalMapper.js";
import { CREATOR_GAME_DEFINITION_SCHEMA_VERSION } from "../src/domain/creatorGameCanonicalDocument.js";

/**
 * Pure mapper coverage — no D1, no B2, no fake repositories. Every case here is a plain
 * SandboxGameRecordCanonicalSource object in, a CreatorCanonicalMappingResult out.
 */

function fullyConfiguredRow(
  overrides: Partial<SandboxGameRecordCanonicalSource> = {},
): SandboxGameRecordCanonicalSource {
  return {
    slug: "my-cool-game",
    title: "My Cool Game",
    shortDescription: "A short description",
    description: "A longer description.",
    genre: "puzzle",
    mode: "single",
    xpPerCompletion: 25,
    scoreUnit: "pts",
    scoreDirection: "desc",
    scoreMin: 0,
    scoreMax: 1000,
    scoreDisplayPrefix: null,
    scoreDisplaySuffix: null,
    updatedAt: "2026-08-15T09:30:00.000Z",
    ...overrides,
  };
}

// ── normal row mapping ───────────────────────────────────────────────────────

test("a fully-configured row maps to a complete canonical document", () => {
  const result = mapSandboxGameRecordToCanonical(fullyConfiguredRow());
  assert.equal(result.ok, true);
  assert.deepEqual(result.ok ? result.document : null, {
    schemaVersion: CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
    slug: "my-cool-game",
    title: "My Cool Game",
    shortDescription: "A short description",
    description: "A longer description.",
    genre: "puzzle",
    mode: "single",
    policy: {
      score: { unit: "pts", direction: "desc", min: 0, max: 1000 },
      leaderboard: true,
      xpPerCompletion: 25,
      requiresAuth: false,
    },
    updatedAt: "2026-08-15T09:30:00.000Z",
  });
});

test("requiresAuth is false — Creator games allow guest play today, the same policy toPublicCreatorGame already hardcodes", () => {
  const result = mapSandboxGameRecordToCanonical(fullyConfiguredRow());
  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.document.policy.requiresAuth : null, false);
});

test("score displayPrefix/displaySuffix pass through when present", () => {
  const result = mapSandboxGameRecordToCanonical(
    fullyConfiguredRow({ scoreDisplayPrefix: "Level ", scoreDisplaySuffix: " ms" }),
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.ok ? result.document.policy.score : null, {
    unit: "pts",
    direction: "desc",
    min: 0,
    max: 1000,
    displayPrefix: "Level ",
    displaySuffix: " ms",
  });
});

// ── decimal score ────────────────────────────────────────────────────────────

test("a decimal score range (min/max) maps through without truncation or rounding", () => {
  const result = mapSandboxGameRecordToCanonical(
    fullyConfiguredRow({ scoreMin: 0.5, scoreMax: 99.9 }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.document.policy.score?.min : null, 0.5);
  assert.equal(result.ok ? result.document.policy.score?.max : null, 99.9);
});

// ── null / optional metadata ─────────────────────────────────────────────────

test("null shortDescription/description project to empty strings, matching sandboxGameAdapter.ts's own convention", () => {
  const result = mapSandboxGameRecordToCanonical(
    fullyConfiguredRow({ shortDescription: null, description: null }),
  );
  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.document.shortDescription : null, "");
  assert.equal(result.ok ? result.document.description : null, "");
});

test("mode: multi passes through", () => {
  const result = mapSandboxGameRecordToCanonical(fullyConfiguredRow({ mode: "multi" }));
  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.document.mode : null, "multi");
});

test("xpPerCompletion: 0 is a real, distinct value from an unconfigured game, not coerced away", () => {
  const result = mapSandboxGameRecordToCanonical(fullyConfiguredRow({ xpPerCompletion: 0 }));
  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.document.policy.xpPerCompletion : null, 0);
});

// ── complete / incomplete score policy ───────────────────────────────────────

test("a row with every score_* column null fails to map — not silently treated as deliberately unscored", () => {
  const result = mapSandboxGameRecordToCanonical(
    fullyConfiguredRow({
      scoreUnit: null,
      scoreDirection: null,
      scoreMin: null,
      scoreMax: null,
    }),
  );
  assert.deepEqual(result, { ok: false, reason: "SCORE_POLICY_NOT_CONFIGURED" });
});

test("a row with only SOME score_* columns set fails to map, the same as none set", () => {
  const result = mapSandboxGameRecordToCanonical(
    fullyConfiguredRow({
      scoreUnit: "pts",
      scoreDirection: "desc",
      scoreMin: null,
      scoreMax: null,
    }),
  );
  assert.deepEqual(result, { ok: false, reason: "SCORE_POLICY_NOT_CONFIGURED" });
});

test("each of the four required score columns being the lone missing one still fails to map", () => {
  const complete = fullyConfiguredRow();
  for (const field of ["scoreUnit", "scoreDirection", "scoreMin", "scoreMax"] as const) {
    const result = mapSandboxGameRecordToCanonical({ ...complete, [field]: null });
    assert.deepEqual(
      result,
      { ok: false, reason: "SCORE_POLICY_NOT_CONFIGURED" },
      `expected mapping to fail when only ${field} is null`,
    );
  }
});

// ── runtime / D1-only fields never enter the canonical document ─────────────

test("the mapper's input type structurally cannot carry id/developerUserId/visibility/liveVersionId/reviewSlot/deletedAt — only SandboxGameRecordCanonicalSource's own fields exist to read", () => {
  // Compile-time guarantee (see creatorGameCanonicalMapper.ts's own doc comment) — this test is
  // the runtime companion: even a caller that HAS a full SandboxGameRecord-shaped object handy
  // and passes it in produces a document with none of that extra data anywhere in it.
  const rowWithExtraFields = {
    ...fullyConfiguredRow(),
    id: 42,
    developerUserId: 7,
    visibility: "PRIVATE",
    liveVersionId: 99,
    reviewSlot: 1,
    deletedAt: "2026-01-01T00:00:00.000Z",
    deletedByAdminId: 3,
    logoKey: "games/42/logo.png",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
  const result = mapSandboxGameRecordToCanonical(rowWithExtraFields);
  assert.equal(result.ok, true);
  const serialized = JSON.stringify(result.ok ? result.document : null);
  for (const leaked of [
    "developerUserId",
    "visibility",
    "liveVersionId",
    "reviewSlot",
    "deletedAt",
    "logoKey",
    "42",
    '"id"',
    "createdAt",
  ]) {
    assert.ok(!serialized.includes(leaked), `canonical document must not contain "${leaked}"`);
  }
});

// ── determinism ───────────────────────────────────────────────────────────────

test("mapping the same row twice produces deep-equal output — no clock, no id generation, no hidden state", () => {
  const row = fullyConfiguredRow();
  const first = mapSandboxGameRecordToCanonical(row);
  const second = mapSandboxGameRecordToCanonical(row);
  assert.deepEqual(first, second);
});

test("updatedAt is the row's own updatedAt verbatim, never a freshly generated timestamp", () => {
  const row = fullyConfiguredRow({ updatedAt: "2020-01-01T00:00:00.000Z" });
  const result = mapSandboxGameRecordToCanonical(row);
  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.document.updatedAt : null, "2020-01-01T00:00:00.000Z");
});
