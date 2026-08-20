import test from "node:test";
import assert from "node:assert/strict";
import {
  GAME_PUBLISHER_TYPES,
  isUserPublished,
  isValidGamePublisherType,
  type GamePublisher,
} from "../src/modules/game/domain/gamePublisher.js";

test("GamePublisher: OWOGG is representable with no id field", () => {
  const publisher: GamePublisher = { type: "OWOGG" };
  assert.equal(publisher.type, "OWOGG");
  assert.ok(!("userId" in publisher));
});

test("GamePublisher: USER is representable with a relational userId", () => {
  const publisher: GamePublisher = { type: "USER", userId: 42 };
  assert.equal(publisher.type, "USER");
  assert.equal((publisher as { userId: number }).userId, 42);
});

test("isUserPublished narrows to UserGamePublisher and exposes userId", () => {
  const owogg: GamePublisher = { type: "OWOGG" };
  const user: GamePublisher = { type: "USER", userId: 7 };

  assert.equal(isUserPublished(owogg), false);
  assert.equal(isUserPublished(user), true);
  if (isUserPublished(user)) {
    assert.equal(user.userId, 7);
  }
});

test("only OWOGG and USER are valid publisher types", () => {
  assert.deepEqual([...GAME_PUBLISHER_TYPES], ["OWOGG", "USER"]);
  assert.ok(isValidGamePublisherType("OWOGG"));
  assert.ok(isValidGamePublisherType("USER"));
  assert.ok(!isValidGamePublisherType("SYSTEM"));
  assert.ok(!isValidGamePublisherType("CREATOR"));
  assert.ok(!isValidGamePublisherType("owogg")); // case-sensitive, not display-name-derived
  assert.ok(!isValidGamePublisherType(undefined));
});

test("GamePublisher has no displayName field — authority can't be read off a presentation string", () => {
  const publisher: GamePublisher = { type: "OWOGG" };
  const serialized = JSON.stringify(publisher);
  assert.ok(!serialized.includes("displayName"), "GamePublisher must not carry a display name");
});
