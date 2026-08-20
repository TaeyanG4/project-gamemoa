import test from "node:test";
import assert from "node:assert/strict";
import { isValidGameIdentity, type GameIdentity, type GamePublisher } from "../src/index.js";

test("isValidGameIdentity: valid USER game identity satisfies all invariants", () => {
  const identity: GameIdentity = {
    id: 1,
    slug: "ball-dodge",
    publisher: {
      type: "USER",
      userId: 42,
    },
    visibility: "PUBLIC",
    liveVersionId: 10,
    deletedAt: null,
    createdAt: "2026-08-19T00:00:00.000Z",
    updatedAt: "2026-08-19T00:00:00.000Z",
  };

  assert.equal(isValidGameIdentity(identity), true);
  assert.equal(identity.publisher.type, "USER");
  assert.equal((identity.publisher as { userId: number }).userId, 42);
});

test("isValidGameIdentity: valid OWOGG game identity satisfies all invariants", () => {
  const identity: GameIdentity = {
    id: 2,
    slug: "reaction-time",
    publisher: {
      type: "OWOGG",
    },
    visibility: "PUBLIC",
    liveVersionId: 1,
    deletedAt: null,
    createdAt: "2026-08-19T00:00:00.000Z",
    updatedAt: "2026-08-19T00:00:00.000Z",
  };

  assert.equal(isValidGameIdentity(identity), true);
  assert.equal(identity.publisher.type, "OWOGG");
});

test("isValidGameIdentity: PRIVATE game with null liveVersionId is valid", () => {
  const identity: GameIdentity = {
    id: 3,
    slug: "draft-game",
    publisher: {
      type: "USER",
      userId: 7,
    },
    visibility: "PRIVATE",
    liveVersionId: null,
    deletedAt: null,
    createdAt: "2026-08-19T00:00:00.000Z",
    updatedAt: "2026-08-19T00:00:00.000Z",
  };

  assert.equal(isValidGameIdentity(identity), true);
  assert.equal(identity.liveVersionId, null);
  assert.equal(identity.visibility, "PRIVATE");
});

test("isValidGameIdentity: soft-deleted game preserves deletedAt timestamp", () => {
  const identity: GameIdentity = {
    id: 4,
    slug: "deleted-game",
    publisher: {
      type: "USER",
      userId: 9,
    },
    visibility: "PRIVATE",
    liveVersionId: null,
    deletedAt: "2026-08-20T12:00:00.000Z",
    createdAt: "2026-08-19T00:00:00.000Z",
    updatedAt: "2026-08-20T12:00:00.000Z",
  };

  assert.equal(isValidGameIdentity(identity), true);
  assert.equal(identity.deletedAt, "2026-08-20T12:00:00.000Z");
});

test("isValidGameIdentity: fail-closed on invalid id or non-integer id", () => {
  assert.equal(
    isValidGameIdentity({
      id: 0,
      slug: "game",
      publisher: { type: "USER", userId: 1 },
      visibility: "PUBLIC",
      liveVersionId: 1,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );

  assert.equal(
    isValidGameIdentity({
      id: -1,
      slug: "game",
      publisher: { type: "USER", userId: 1 },
      visibility: "PUBLIC",
      liveVersionId: 1,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );

  assert.equal(
    isValidGameIdentity({
      id: 1.5,
      slug: "game",
      publisher: { type: "USER", userId: 1 },
      visibility: "PUBLIC",
      liveVersionId: 1,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );
});

test("isValidGameIdentity: fail-closed on empty or whitespace slug", () => {
  assert.equal(
    isValidGameIdentity({
      id: 1,
      slug: "",
      publisher: { type: "USER", userId: 1 },
      visibility: "PUBLIC",
      liveVersionId: 1,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );

  assert.equal(
    isValidGameIdentity({
      id: 1,
      slug: "   ",
      publisher: { type: "USER", userId: 1 },
      visibility: "PUBLIC",
      liveVersionId: 1,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );
});

test("isValidGameIdentity: fail-closed on invalid publisher", () => {
  assert.equal(
    isValidGameIdentity({
      id: 1,
      slug: "game",
      publisher: { type: "UNKNOWN" as unknown as GamePublisher["type"] },
      visibility: "PUBLIC",
      liveVersionId: 1,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );

  assert.equal(
    isValidGameIdentity({
      id: 1,
      slug: "game",
      publisher: { type: "USER", userId: 0 },
      visibility: "PUBLIC",
      liveVersionId: 1,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );

  assert.equal(
    isValidGameIdentity({
      id: 1,
      slug: "game",
      publisher: { type: "USER", userId: NaN },
      visibility: "PUBLIC",
      liveVersionId: 1,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );
});

test("isValidGameIdentity: fail-closed on invalid visibility", () => {
  assert.equal(
    isValidGameIdentity({
      id: 1,
      slug: "game",
      publisher: { type: "USER", userId: 1 },
      visibility: "UNLISTED" as unknown as "PUBLIC",
      liveVersionId: 1,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );
});

test("isValidGameIdentity: fail-closed on invalid liveVersionId", () => {
  assert.equal(
    isValidGameIdentity({
      id: 1,
      slug: "game",
      publisher: { type: "USER", userId: 1 },
      visibility: "PUBLIC",
      liveVersionId: 0,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );

  assert.equal(
    isValidGameIdentity({
      id: 1,
      slug: "game",
      publisher: { type: "USER", userId: 1 },
      visibility: "PUBLIC",
      liveVersionId: -5,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );
});

test("isValidGameIdentity: fail-closed on missing timestamps", () => {
  assert.equal(
    isValidGameIdentity({
      id: 1,
      slug: "game",
      publisher: { type: "USER", userId: 1 },
      visibility: "PUBLIC",
      liveVersionId: 1,
      deletedAt: null,
      createdAt: "",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );

  assert.equal(
    isValidGameIdentity({
      id: 1,
      slug: "game",
      publisher: { type: "USER", userId: 1 },
      visibility: "PUBLIC",
      liveVersionId: 1,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "",
    }),
    false,
  );
});
