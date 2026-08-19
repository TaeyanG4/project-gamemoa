import test from "node:test";
import assert from "node:assert/strict";
import {
  computeCreatorCanonicalScorePatch,
  patchCreatorCanonicalDocument,
} from "../src/domain/creatorGameCanonicalPatch.js";
import { CREATOR_GAME_DEFINITION_SCHEMA_VERSION } from "../src/domain/creatorGameCanonicalDocument.js";
import type { CreatorGameCanonicalDocument } from "../src/domain/creatorGameCanonicalDocument.js";
import type { SandboxGameMetadataInput, SandboxGameRecord } from "../src/ports/sandboxGames.js";

function canonicalDoc(
  overrides: Partial<CreatorGameCanonicalDocument> = {},
): CreatorGameCanonicalDocument {
  return {
    schemaVersion: CREATOR_GAME_DEFINITION_SCHEMA_VERSION,
    slug: "my-game",
    title: "Existing Title",
    shortDescription: "Existing short",
    description: "Existing long",
    genre: "puzzle",
    mode: "single",
    policy: {
      score: { unit: "pts", direction: "desc", min: 0, max: 100 },
      leaderboard: true,
      xpPerCompletion: 10,
      requiresAuth: false,
    },
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function updatedRow(overrides: Partial<SandboxGameRecord> = {}): SandboxGameRecord {
  return {
    id: 1,
    slug: "my-game",
    developerUserId: 1,
    title: "Existing Title",
    shortDescription: "Existing short",
    description: "Existing long",
    genre: "puzzle",
    mode: "single",
    logoKey: null,
    xpPerCompletion: 10,
    scoreUnit: "pts",
    scoreDirection: "desc",
    scoreMin: 0,
    scoreMax: 100,
    scoreDisplayPrefix: null,
    scoreDisplaySuffix: null,
    visibility: "PUBLIC",
    liveVersionId: 5,
    reviewSlot: null,
    deletedAt: null,
    deletedByAdminId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}

// ── computeCreatorCanonicalScorePatch ────────────────────────────────────────
//
// B2 (`existingScore`) is always the base — D1 is never read by this function at all (no
// SandboxGameRecord parameter exists). Only the fields `input` explicitly names are ever
// overridden.

test("score patch: existing ScoreConfig + patch touching no score field -> unchanged", () => {
  const existing = { unit: "pts", direction: "desc" as const, min: 0, max: 100 };
  const result = computeCreatorCanonicalScorePatch(existing, {});
  assert.deepEqual(result, { ok: true, score: existing });
});

test("score patch: existing ScoreConfig + partial patch overrides only the named field, everything else from B2", () => {
  const existing = {
    unit: "seconds",
    direction: "asc" as const,
    min: 0.5,
    max: 100,
    displayPrefix: "T:",
  };
  const input: SandboxGameMetadataInput = { scoreMax: 200 };
  const result = computeCreatorCanonicalScorePatch(existing, input);
  assert.deepEqual(result, {
    ok: true,
    score: { unit: "seconds", direction: "asc", min: 0.5, max: 200, displayPrefix: "T:" },
  });
});

test("score patch: existing ScoreConfig + patch that would null out a required field -> rejected before ever becoming score:null", () => {
  const existing = { unit: "pts", direction: "desc" as const, min: 0, max: 100 };
  const input: SandboxGameMetadataInput = { scoreMax: null };
  const result = computeCreatorCanonicalScorePatch(existing, input);
  assert.deepEqual(result, { ok: false, reason: "SCORE_POLICY_WOULD_BECOME_INCOMPLETE" });
});

test("score patch: existing ScoreConfig + decimal min/max are preserved without truncation when untouched", () => {
  const existing = { unit: "s", direction: "asc" as const, min: 0.5, max: 99.9 };
  const result = computeCreatorCanonicalScorePatch(existing, {});
  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.score?.min : null, 0.5);
  assert.equal(result.ok ? result.score?.max : null, 99.9);
});

test("score patch: existing score:null + patch touching no score field -> stays null", () => {
  const result = computeCreatorCanonicalScorePatch(null, {});
  assert.deepEqual(result, { ok: true, score: null });
});

test("score patch: existing score:null + an incomplete score patch -> rejected as ambiguous, never partially activated", () => {
  const input: SandboxGameMetadataInput = { scoreUnit: "pts", scoreDirection: "desc" }; // min/max missing
  const result = computeCreatorCanonicalScorePatch(null, input);
  assert.deepEqual(result, { ok: false, reason: "AMBIGUOUS_SCORE_POLICY_ACTIVATION" });
});

test("score patch: existing score:null + all four required fields explicitly provided -> activates a real ScoreConfig", () => {
  const input: SandboxGameMetadataInput = {
    scoreUnit: "pts",
    scoreDirection: "desc",
    scoreMin: 0,
    scoreMax: 100,
  };
  const result = computeCreatorCanonicalScorePatch(null, input);
  assert.deepEqual(result, {
    ok: true,
    score: { unit: "pts", direction: "desc", min: 0, max: 100 },
  });
});

test("score patch: existing ScoreConfig + displayPrefix/displaySuffix omitted entirely when absent from both B2 and the request", () => {
  const existing = { unit: "pts", direction: "desc" as const, min: 0, max: 100 };
  const result = computeCreatorCanonicalScorePatch(existing, { scoreMin: 5 });
  assert.equal(result.ok, true);
  assert.ok(result.ok && result.score && !("displayPrefix" in result.score));
  assert.ok(result.ok && result.score && !("displaySuffix" in result.score));
});

// -- B2 source-of-truth regression tests (this PR's own fix) --

test("score patch [A]: D1 diverged from B2 on unit/direction/min/displayPrefix — a scoreMax-only PATCH changes ONLY scoreMax, everything else stays B2's", () => {
  // B2: unit=seconds direction=asc min=0.5 max=100 displayPrefix=T:
  // D1 (stale/diverged, never consulted): unit=pts direction=desc min=0 max=999 displayPrefix=OLD
  const existing = {
    unit: "seconds",
    direction: "asc" as const,
    min: 0.5,
    max: 100,
    displayPrefix: "T:",
  };
  const input: SandboxGameMetadataInput = { scoreMax: 200 };

  const result = computeCreatorCanonicalScorePatch(existing, input);

  assert.deepEqual(result, {
    ok: true,
    score: { unit: "seconds", direction: "asc", min: 0.5, max: 200, displayPrefix: "T:" },
  });
});

test("score patch [B]: D1's required score columns are incomplete/stale, but B2's ScoreConfig is complete — a scoreMax-only PATCH is still a valid canonical patch, D1 state is irrelevant to this decision", () => {
  // computeCreatorCanonicalScorePatch takes no D1 row at all — this test's own name is the
  // assertion: there is no D1 input to this function that could make it reject.
  const existing = { unit: "seconds", direction: "asc" as const, min: 0.5, max: 100 };
  const result = computeCreatorCanonicalScorePatch(existing, { scoreMax: 200 });
  assert.equal(result.ok, true);
});

test("score patch [C]: patching only displayPrefix leaves unit/direction/min/max exactly as B2 had them", () => {
  const existing = { unit: "seconds", direction: "asc" as const, min: 0.5, max: 100 };
  const result = computeCreatorCanonicalScorePatch(existing, { scoreDisplayPrefix: "New:" });
  assert.deepEqual(result, {
    ok: true,
    score: { unit: "seconds", direction: "asc", min: 0.5, max: 100, displayPrefix: "New:" },
  });
});

test("score patch [D]: score:null activation never lets a D1 stale displayPrefix/displaySuffix leak into the new ScoreConfig", () => {
  // The request itself supplies the required four but no display fields — nothing here is a D1
  // row, so there is nothing for a stale value to come from except the request itself, which
  // this test confirms doesn't happen implicitly.
  const input: SandboxGameMetadataInput = {
    scoreUnit: "pts",
    scoreDirection: "desc",
    scoreMin: 0,
    scoreMax: 100,
  };
  const result = computeCreatorCanonicalScorePatch(null, input);
  assert.equal(result.ok, true);
  assert.ok(result.ok && result.score && !("displayPrefix" in result.score));
  assert.ok(result.ok && result.score && !("displaySuffix" in result.score));
});

test("score patch [E]: score:null activation with an explicit displayPrefix in the request includes only that value", () => {
  const input: SandboxGameMetadataInput = {
    scoreUnit: "pts",
    scoreDirection: "desc",
    scoreMin: 0,
    scoreMax: 100,
    scoreDisplayPrefix: "Lvl ",
  };
  const result = computeCreatorCanonicalScorePatch(null, input);
  assert.deepEqual(result, {
    ok: true,
    score: { unit: "pts", direction: "desc", min: 0, max: 100, displayPrefix: "Lvl " },
  });
});

test("score patch [F]: an explicit null on a required field is still rejected before any write, base-from-B2 or not", () => {
  const existing = { unit: "seconds", direction: "asc" as const, min: 0.5, max: 100 };
  const result = computeCreatorCanonicalScorePatch(existing, { scoreUnit: null });
  assert.deepEqual(result, { ok: false, reason: "SCORE_POLICY_WOULD_BECOME_INCOMPLETE" });
});

// ── patchCreatorCanonicalDocument ────────────────────────────────────────────

test("document patch: title-only change updates only title, everything else (including presentation) preserved", () => {
  const presentation = {
    viewport: { mode: "fixed" as const, preferredWidth: 640, preferredHeight: 360 },
    fullscreen: { supported: true, recommended: false },
    mobile: { support: "unsupported" as const },
  };
  const existing = canonicalDoc({ presentation });
  const row = updatedRow({ title: "New Title" });
  const input: SandboxGameMetadataInput = { title: "New Title" };

  const result = patchCreatorCanonicalDocument(existing, row, input);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.document.title, "New Title");
    assert.equal(result.document.description, existing.description);
    assert.equal(result.document.genre, existing.genre);
    assert.deepEqual(result.document.presentation, presentation);
    assert.equal(result.document.mode, existing.mode);
    assert.equal(result.document.slug, existing.slug);
  }
});

test("document patch: genre/description change leaves everything else untouched", () => {
  const existing = canonicalDoc();
  const row = updatedRow({ genre: "arcade", description: "New description" });
  const input: SandboxGameMetadataInput = { genre: "arcade", description: "New description" };

  const result = patchCreatorCanonicalDocument(existing, row, input);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.document.genre, "arcade");
    assert.equal(result.document.description, "New description");
    assert.equal(result.document.title, existing.title);
    assert.equal(result.document.shortDescription, existing.shortDescription);
    assert.deepEqual(result.document.policy, existing.policy);
  }
});

test("document patch: xpPerCompletion change preserves requiresAuth/leaderboard", () => {
  const existing = canonicalDoc();
  const row = updatedRow({ xpPerCompletion: 50 });
  const input: SandboxGameMetadataInput = { xpPerCompletion: 50 };

  const result = patchCreatorCanonicalDocument(existing, row, input);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.document.policy.xpPerCompletion, 50);
    assert.equal(result.document.policy.requiresAuth, existing.policy.requiresAuth);
    assert.equal(result.document.policy.leaderboard, existing.policy.leaderboard);
  }
});

test("document patch: a rejected score transition returns ok:false and builds no document", () => {
  const existing = canonicalDoc(); // has a real ScoreConfig
  const row = updatedRow({ scoreMax: null });
  const input: SandboxGameMetadataInput = { scoreMax: null };

  const result = patchCreatorCanonicalDocument(existing, row, input);
  assert.deepEqual(result, { ok: false, reason: "SCORE_POLICY_WOULD_BECOME_INCOMPLETE" });
});

test("document patch: explicit score:null is preserved by a title-only patch", () => {
  const existing = canonicalDoc({
    policy: { score: null, leaderboard: false, xpPerCompletion: 0, requiresAuth: false },
  });
  const row = updatedRow({
    title: "New Title",
    scoreUnit: null,
    scoreDirection: null,
    scoreMin: null,
    scoreMax: null,
  });
  const input: SandboxGameMetadataInput = { title: "New Title" };

  const result = patchCreatorCanonicalDocument(existing, row, input);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.document.policy.score, null);
    assert.equal(result.document.title, "New Title");
  }
});

test("document patch: updatedAt comes from updatedRow.updatedAt, never independently generated", () => {
  const existing = canonicalDoc({ updatedAt: "2026-01-01T00:00:00.000Z" });
  const row = updatedRow({ updatedAt: "2026-05-05T05:05:05.000Z" });
  const input: SandboxGameMetadataInput = { title: row.title };

  const result = patchCreatorCanonicalDocument(existing, row, input);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.document.updatedAt, "2026-05-05T05:05:05.000Z");
  }
});

test("document patch: slug and mode are never changed by any metadata patch", () => {
  const existing = canonicalDoc({ slug: "fixed-slug", mode: "multi" });
  const row = updatedRow({ slug: "fixed-slug", mode: "multi", title: "New Title" });
  const input: SandboxGameMetadataInput = { title: "New Title" };

  const result = patchCreatorCanonicalDocument(existing, row, input);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.document.slug, "fixed-slug");
    assert.equal(result.document.mode, "multi");
  }
});

test("document patch: an empty input produces a document identical to the existing one (aside from updatedAt)", () => {
  const existing = canonicalDoc();
  const row = updatedRow({ updatedAt: existing.updatedAt }); // D1 no-op update, updatedAt unchanged
  const result = patchCreatorCanonicalDocument(existing, row, {});
  assert.deepEqual(result, { ok: true, document: existing });
});

test("document patch: D1/B2 divergence on score fields the patch doesn't name never bleeds into the saved document", () => {
  // existing B2 canonical's score has its own values; updatedRow (D1's post-mutation state)
  // deliberately carries different score_* values for the fields NOT named in `input` — proving
  // patchCreatorCanonicalDocument's score computation reads only from `existing`+`input`, never
  // from `updatedRow`'s score_* columns at all.
  const existing = canonicalDoc({
    policy: {
      score: { unit: "seconds", direction: "asc", min: 0.5, max: 100, displayPrefix: "T:" },
      leaderboard: true,
      xpPerCompletion: 10,
      requiresAuth: false,
    },
  });
  const row = updatedRow({
    scoreUnit: "pts",
    scoreDirection: "desc",
    scoreMin: 0,
    scoreMax: 999,
    scoreDisplayPrefix: "OLD",
  });
  const input: SandboxGameMetadataInput = { scoreMax: 200 };

  const result = patchCreatorCanonicalDocument(existing, row, input);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.document.policy.score, {
      unit: "seconds",
      direction: "asc",
      min: 0.5,
      max: 200,
      displayPrefix: "T:",
    });
  }
});
