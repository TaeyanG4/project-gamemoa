import test from "node:test";
import assert from "node:assert/strict";
import type { GameRuntimeContext } from "@owogg/game-sdk";
import { LegacyReactRuntime } from "../features/game/runtime/LegacyReactRuntime";

/**
 * LegacyReactRuntime has no hooks and no DOM dependency — it's a pure function from props to one
 * React element — so it can be exercised by calling it directly (the way React itself would call
 * a function component during render) and inspecting the returned element, without a renderer.
 * The web test suite has no jsdom/testing-library (and this PR adds no new dependency), so this
 * is the level this component's contract can actually be pinned at here.
 */

function FakeGame() {
  return null;
}

const fakeRuntime: GameRuntimeContext = {
  sessionId: "session-1",
  user: null,
  difficultyId: "normal",
  emit: () => {},
  complete: async () => {},
  cancel: () => {},
};

test("renders the given GameComponent as the element type", () => {
  const element = LegacyReactRuntime({
    GameComponent: FakeGame,
    runtime: fakeRuntime,
    attemptKey: 0,
  });
  assert.equal(element.type, FakeGame);
});

test("passes the runtime object through unmodified", () => {
  const element = LegacyReactRuntime({
    GameComponent: FakeGame,
    runtime: fakeRuntime,
    attemptKey: 0,
  });
  assert.equal(element.props.runtime, fakeRuntime);
});

test("keys the element by attemptKey — this is what makes retry remount the game without reloading it", () => {
  const first = LegacyReactRuntime({
    GameComponent: FakeGame,
    runtime: fakeRuntime,
    attemptKey: 0,
  });
  const second = LegacyReactRuntime({
    GameComponent: FakeGame,
    runtime: fakeRuntime,
    attemptKey: 1,
  });

  assert.equal(first.key, "0");
  assert.equal(second.key, "1");
  assert.notEqual(first.key, second.key);
});

test("renders exactly one element, no wrapper markup around the game component", () => {
  const element = LegacyReactRuntime({
    GameComponent: FakeGame,
    runtime: fakeRuntime,
    attemptKey: 0,
  });
  // Only `runtime` on props — no extra wrapper props/children this component might otherwise
  // have introduced (e.g. accidentally spreading attemptKey into props instead of using it as
  // the element key).
  assert.deepEqual(Object.keys(element.props), ["runtime"]);
});
