import test from "node:test";
import assert from "node:assert/strict";
import {
  mergePublicGames,
  resolvePublicGame,
  toPublicCreatorGame,
  toPublicSystemGame,
} from "../src/modules/game/domain/publicGame.js";
import { GAME_DEFINITIONS } from "../src/registry/gameDefinitions.generated.js";
import type { GameDefinition } from "../src/modules/game/domain/gameDefinition.js";
import type { SandboxGameRecord } from "../src/ports/sandboxGames.js";

function sandboxRecord(overrides: Partial<SandboxGameRecord> = {}): SandboxGameRecord {
  return {
    id: 1,
    slug: "ball-dodge",
    developerUserId: 7,
    title: "공 피하기",
    shortDescription: "떨어지는 공을 피하세요",
    description: null,
    genre: "arcade",
    mode: "single",
    logoKey: null,
    xpPerCompletion: 0,
    scoreUnit: null,
    scoreDirection: null,
    scoreMin: null,
    scoreMax: null,
    scoreDisplayPrefix: null,
    scoreDisplaySuffix: null,
    visibility: "PUBLIC",
    liveVersionId: 3,
    reviewSlot: null,
    deletedAt: null,
    deletedByAdminId: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

const REACTION_TIME = GAME_DEFINITIONS.find((d) => d.slug === "reaction-time");
assert.ok(REACTION_TIME, "fixture assumption: reaction-time exists in the real registry");

// ── toPublicSystemGame ────────────────────────────────────────────────────────

test("toPublicSystemGame carries the real registry's fields through verbatim", () => {
  const pub = toPublicSystemGame(REACTION_TIME);
  assert.equal(pub.ownerType, "SYSTEM");
  assert.equal(pub.slug, "reaction-time");
  assert.equal(pub.title, REACTION_TIME.title);
  assert.deepEqual(pub.categories, REACTION_TIME.categories);
  assert.equal(pub.requiresAuth, REACTION_TIME.policy.requiresAuth);
  assert.equal(pub.supportsLeaderboard, REACTION_TIME.policy.leaderboard);
});

test("toPublicSystemGame never exposes policy.score or policy.xpPerCompletion directly", () => {
  const pub = toPublicSystemGame(REACTION_TIME) as Record<string, unknown>;
  assert.equal("score" in pub, false);
  assert.equal("xpPerCompletion" in pub, false);
  assert.equal("policy" in pub, false);
});

test("toPublicSystemGame omits accent entirely when the definition has none, rather than null", () => {
  const withoutAccent: GameDefinition = { ...REACTION_TIME, accent: undefined };
  const pub = toPublicSystemGame(withoutAccent);
  assert.equal("accent" in pub, false);
});

// ── toPublicCreatorGame ───────────────────────────────────────────────────────

test("toPublicCreatorGame narrows to public-safe fields only", () => {
  const pub = toPublicCreatorGame(sandboxRecord()) as Record<string, unknown>;
  for (const internal of [
    "id",
    "developerUserId",
    "logoKey",
    "xpPerCompletion",
    "scoreUnit",
    "scoreDirection",
    "scoreMin",
    "scoreMax",
    "visibility",
    "liveVersionId",
    "reviewSlot",
    "deletedAt",
    "deletedByAdminId",
    "createdAt",
    "updatedAt",
  ]) {
    assert.equal(internal in pub, false, `${internal} must not appear on the public shape`);
  }
});

test("toPublicCreatorGame derives hasLogo from logoKey without ever exposing the key", () => {
  const withLogo = toPublicCreatorGame(sandboxRecord({ logoKey: "games/1/logo.png" }));
  assert.equal(withLogo.hasLogo, true);
  assert.equal("logoKey" in withLogo, false);

  const withoutLogo = toPublicCreatorGame(sandboxRecord({ logoKey: null }));
  assert.equal(withoutLogo.hasLogo, false);
});

test("toPublicCreatorGame hardcodes requiresAuth/supportsLeaderboard false regardless of the record", () => {
  // Not read off scoreDirection/scoreMin/scoreMax even when a game happens to have them set —
  // creator score submission is unsupported today, full stop.
  const pub = toPublicCreatorGame(
    sandboxRecord({ scoreDirection: "asc", scoreMin: 0, scoreMax: 100 }),
  );
  assert.equal(pub.requiresAuth, false);
  assert.equal(pub.supportsLeaderboard, false);
});

// ── mergePublicGames ──────────────────────────────────────────────────────────

test("mergePublicGames lists every SYSTEM game before any CREATOR game", () => {
  const merged = mergePublicGames(GAME_DEFINITIONS, [
    sandboxRecord({ slug: "ball-dodge" }),
    sandboxRecord({ slug: "another-game" }),
  ]);

  assert.equal(merged.length, GAME_DEFINITIONS.length + 2);
  const ownerTypes = merged.map((g) => g.ownerType);
  const firstCreatorIndex = ownerTypes.indexOf("CREATOR");
  assert.equal(firstCreatorIndex, GAME_DEFINITIONS.length);
  assert.ok(ownerTypes.slice(0, firstCreatorIndex).every((t) => t === "SYSTEM"));
});

test("mergePublicGames does not re-sort either half", () => {
  const reversedSystem = [...GAME_DEFINITIONS].reverse();
  const creator = [sandboxRecord({ slug: "z-game" }), sandboxRecord({ slug: "a-game" })];

  const merged = mergePublicGames(reversedSystem, creator);
  assert.deepEqual(
    merged.slice(0, reversedSystem.length).map((g) => g.slug),
    reversedSystem.map((d) => d.slug),
  );
  assert.deepEqual(
    merged.slice(reversedSystem.length).map((g) => g.slug),
    ["z-game", "a-game"],
  );
});

test("mergePublicGames handles an empty side of either source", () => {
  assert.equal(mergePublicGames([], []).length, 0);
  assert.equal(mergePublicGames(GAME_DEFINITIONS, []).length, GAME_DEFINITIONS.length);
  assert.equal(mergePublicGames([], [sandboxRecord()]).length, 1);
});

test("mergePublicGames: a creator game sharing a SYSTEM slug is dropped, leaving exactly one entry for that slug", () => {
  // The list-level counterpart to resolvePublicGame's single-slug policy: SYSTEM always wins, so
  // the merged list must never show the same slug twice, and a lookup of that slug via
  // GET /api/games/:slug (which goes through resolvePublicGame, not this function) must agree
  // with whichever single entry appears here. Registration itself is guarded too now
  // (SandboxGameUseCases.createGame rejects a SYSTEM-slug collision with SLUG_TAKEN) — this test
  // is the read-side guarantee that holds even for a row that predates that guard.
  const impostor = sandboxRecord({ slug: "reaction-time", title: "가짜 반응속도 게임" });
  const legitimate = sandboxRecord({ slug: "ball-dodge" });

  const merged = mergePublicGames(GAME_DEFINITIONS, [impostor, legitimate]);

  const reactionTimeEntries = merged.filter((g) => g.slug === "reaction-time");
  assert.equal(reactionTimeEntries.length, 1, "exactly one entry for the colliding slug");
  assert.equal(reactionTimeEntries[0]?.ownerType, "SYSTEM");

  // The non-colliding creator game is unaffected.
  assert.ok(merged.some((g) => g.slug === "ball-dodge" && g.ownerType === "CREATOR"));
  assert.equal(merged.length, GAME_DEFINITIONS.length + 1);
});

// ── resolvePublicGame ─────────────────────────────────────────────────────────

test("resolvePublicGame returns the SYSTEM game when only SYSTEM resolves", () => {
  const result = resolvePublicGame(REACTION_TIME, null);
  assert.equal(result?.ownerType, "SYSTEM");
  assert.equal(result?.slug, "reaction-time");
});

test("resolvePublicGame returns the CREATOR game when only CREATOR resolves", () => {
  const result = resolvePublicGame(null, sandboxRecord({ slug: "ball-dodge" }));
  assert.equal(result?.ownerType, "CREATOR");
  assert.equal(result?.slug, "ball-dodge");
});

test("resolvePublicGame returns null when neither resolves", () => {
  assert.equal(resolvePublicGame(null, null), null);
});

test("resolvePublicGame: SYSTEM always wins a same-slug collision — a second guarantee alongside the P-03 registration guard, not a replacement for it", () => {
  // SandboxGameUseCases.createGame now rejects a SYSTEM-slug collision at registration time
  // (SLUG_TAKEN). This test is the read-side guarantee that holds regardless: even if a colliding
  // row exists (created before that guard, or by some other path), resolving the official slug
  // must never return the impostor's content.
  const impostor = sandboxRecord({ slug: "reaction-time", title: "가짜 반응속도 게임" });
  const result = resolvePublicGame(REACTION_TIME, impostor);

  assert.equal(result?.ownerType, "SYSTEM");
  assert.equal((result as { title: string }).title, REACTION_TIME.title);
});
