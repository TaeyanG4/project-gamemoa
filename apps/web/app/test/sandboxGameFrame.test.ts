import test from "node:test";
import assert from "node:assert/strict";
import {
  SANDBOX_GAME_IFRAME_SANDBOX,
  SANDBOX_GAME_IFRAME_ALLOW,
} from "../components/games/SandboxGameFrame";
import { getGameOrigin, sandboxGamePlayUrl, API_URL } from "../lib/api/config";

// The iframe sandbox policy is the boundary protecting the main app from uploaded third-party game
// code, so it is asserted rather than left to review — a well-meaning "just add allow-same-origin
// to make the engine work" is exactly the change this is here to catch.
test("the game iframe grants only scripts and pointer lock", () => {
  assert.equal(SANDBOX_GAME_IFRAME_SANDBOX, "allow-scripts allow-pointer-lock");
});

test("the game iframe never grants allow-same-origin, which would collapse the origin boundary", () => {
  assert.ok(!SANDBOX_GAME_IFRAME_SANDBOX.includes("allow-same-origin"));
});

test("the game iframe grants no capability beyond fullscreen presentation", () => {
  assert.equal(SANDBOX_GAME_IFRAME_ALLOW, "fullscreen");
  for (const capability of ["camera", "microphone", "geolocation", "payment", "usb", "midi"]) {
    assert.ok(!SANDBOX_GAME_IFRAME_ALLOW.includes(capability), capability);
  }
});

test("the game iframe does not grant top-level navigation, popups, or form submission", () => {
  for (const token of [
    "allow-top-navigation",
    "allow-popups",
    "allow-forms",
    "allow-modals",
    "allow-downloads",
  ]) {
    assert.ok(!SANDBOX_GAME_IFRAME_SANDBOX.includes(token), token);
  }
});

test("the game origin is resolved from configuration, not hardcoded to one hostname", () => {
  // Without VITE_GAME_ORIGIN set (as in this test process) it falls back to the API origin, which
  // is itself configurable — so no play URL is ever pinned to a literal in a component.
  assert.equal(getGameOrigin(), API_URL);
});

test("sandboxGamePlayUrl points at the live-version resolver and escapes the slug", () => {
  assert.equal(sandboxGamePlayUrl("my-game"), `${API_URL}/play/my-game`);
  assert.equal(sandboxGamePlayUrl("a b"), `${API_URL}/play/a%20b`);
});
