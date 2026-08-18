import test from "node:test";
import assert from "node:assert/strict";
import { sandboxGameRedirectTarget } from "../routes/sandboxGamePlay";

/**
 * sandboxGameRedirectTarget is the pure half of the /sandbox-games/:slug -> /games/:slug redirect
 * — extracted specifically so it's testable without a DOM renderer (this suite has none; the
 * <Navigate replace> component itself, and therefore the actual client-side redirect behavior,
 * isn't exercised by an automated test here). Regression coverage for the legacy-route
 * compatibility this route exists for: an old bookmark/external link to /sandbox-games/:slug must
 * keep landing on a working page.
 */

test("preserves the slug exactly, routing to /games/:slug", () => {
  assert.equal(sandboxGameRedirectTarget("ball-dodge"), "/games/ball-dodge");
});

test("escapes a slug that isn't already URL-safe (defensive — real slugs are [a-z0-9-]+)", () => {
  assert.equal(sandboxGameRedirectTarget("a b"), "/games/a%20b");
  assert.equal(sandboxGameRedirectTarget("weird/slug"), "/games/weird%2Fslug");
});

test("an empty slug still produces a well-formed target rather than throwing", () => {
  assert.doesNotThrow(() => sandboxGameRedirectTarget(""));
  assert.equal(sandboxGameRedirectTarget(""), "/games/");
});
