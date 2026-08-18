import test from "node:test";
import assert from "node:assert/strict";
import {
  canApplyForGameCreator,
  hasImplicitGameCreatorAccess,
  GAME_CREATOR_ACCESS_STATUSES,
  GAME_CREATOR_APPLICATION_STATUSES,
} from "../src/domain/gameCreator.js";

// Pure domain coverage for the Game Creator program policy hooks. See docs/AUTHORIZATION.md §5.

test("canApplyForGameCreator: self-serve applications are currently closed (2026-08-18 operational decision)", () => {
  assert.equal(canApplyForGameCreator(), false);
});

test("hasImplicitGameCreatorAccess: ADMIN/OPERATOR/SYSTEM_DEVELOPER get it, MODERATOR and no-role do not", () => {
  assert.equal(hasImplicitGameCreatorAccess("ADMIN"), true);
  assert.equal(hasImplicitGameCreatorAccess("OPERATOR"), true);
  assert.equal(hasImplicitGameCreatorAccess("SYSTEM_DEVELOPER"), true);
  assert.equal(hasImplicitGameCreatorAccess("MODERATOR"), false);
  assert.equal(hasImplicitGameCreatorAccess(null), false);
});

test("GAME_CREATOR_ACCESS_STATUSES / GAME_CREATOR_APPLICATION_STATUSES are unchanged by the closure policy", () => {
  // Sanity check that closing self-serve applications didn't accidentally touch the status
  // catalogs themselves — existing ACTIVE grants and past applications keep their real states.
  assert.deepEqual(GAME_CREATOR_ACCESS_STATUSES, ["ACTIVE", "REVOKED"]);
  assert.deepEqual(GAME_CREATOR_APPLICATION_STATUSES, [
    "PENDING",
    "APPROVED",
    "REJECTED",
    "WITHDRAWN",
  ]);
});
