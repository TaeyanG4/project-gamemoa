import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidGameIdentity,
  isValidGamePublisher,
  type GameIdentity,
  type GamePublisher,
} from "../src/index.js";

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

test("isValidGameIdentity: PUBLIC game with null liveVersionId is invalid (PUBLIC runtime invariant)", () => {
  const identity: GameIdentity = {
    id: 3,
    slug: "public-without-version",
    publisher: {
      type: "USER",
      userId: 7,
    },
    visibility: "PUBLIC",
    liveVersionId: null,
    deletedAt: null,
    createdAt: "2026-08-19T00:00:00.000Z",
    updatedAt: "2026-08-19T00:00:00.000Z",
  };

  assert.equal(isValidGameIdentity(identity), false);
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

test("isValidGameIdentity: fail-closed on padded or whitespace-only slug", () => {
  // Empty
  assert.equal(
    isValidGameIdentity({
      id: 1,
      slug: "",
      publisher: { type: "USER", userId: 1 },
      visibility: "PRIVATE",
      liveVersionId: null,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );

  // Whitespace only
  assert.equal(
    isValidGameIdentity({
      id: 1,
      slug: "   ",
      publisher: { type: "USER", userId: 1 },
      visibility: "PRIVATE",
      liveVersionId: null,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );

  // Leading whitespace
  assert.equal(
    isValidGameIdentity({
      id: 1,
      slug: " ball-dodge",
      publisher: { type: "USER", userId: 1 },
      visibility: "PRIVATE",
      liveVersionId: null,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );

  // Trailing whitespace
  assert.equal(
    isValidGameIdentity({
      id: 1,
      slug: "ball-dodge ",
      publisher: { type: "USER", userId: 1 },
      visibility: "PRIVATE",
      liveVersionId: null,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );
});

test("isValidGamePublisher: rejects OWOGG publisher carrying userId", () => {
  assert.equal(isValidGamePublisher({ type: "OWOGG" }), true);
  assert.equal(isValidGamePublisher({ type: "OWOGG", userId: 123 }), false);
  assert.equal(isValidGamePublisher({ type: "USER", userId: 123 }), true);
  assert.equal(isValidGamePublisher({ type: "USER", userId: 0 }), false);
  assert.equal(isValidGamePublisher({ type: "USER", userId: -1 }), false);
  assert.equal(isValidGamePublisher({ type: "USER" }), false);
  assert.equal(isValidGamePublisher(null), false);
  assert.equal(isValidGamePublisher("OWOGG"), false);
});

test("isValidGameIdentity: fail-closed on invalid publisher shape including OWOGG with userId", () => {
  assert.equal(
    isValidGameIdentity({
      id: 1,
      slug: "game",
      publisher: { type: "OWOGG", userId: 123 } as unknown as GamePublisher,
      visibility: "PRIVATE",
      liveVersionId: null,
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
      publisher: { type: "UNKNOWN" as unknown as GamePublisher["type"] },
      visibility: "PRIVATE",
      liveVersionId: null,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }),
    false,
  );
});

test("isValidGameIdentity: fail-closed on invalid id or non-integer id", () => {
  assert.equal(
    isValidGameIdentity({
      id: 0,
      slug: "game",
      publisher: { type: "USER", userId: 1 },
      visibility: "PRIVATE",
      liveVersionId: null,
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
      visibility: "PRIVATE",
      liveVersionId: null,
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
      visibility: "PRIVATE",
      liveVersionId: null,
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
      liveVersionId: null,
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
      visibility: "PRIVATE",
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
      visibility: "PRIVATE",
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
      visibility: "PRIVATE",
      liveVersionId: null,
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
      visibility: "PRIVATE",
      liveVersionId: null,
      deletedAt: null,
      createdAt: "2026-08-19T00:00:00.000Z",
      updatedAt: "",
    }),
    false,
  );
});
