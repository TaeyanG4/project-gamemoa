import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// GoogleStepUpPanel (the "1 Google 본인 확인" step of /admin) renders Google's own button via
// `google.accounts.id.renderButton(containerRef.current, ...)` inside a `useEffect`. root.tsx
// loads the async Google Identity Services script on every page, so by the time an admin visits
// /admin a second time (GIS already warm from an earlier page), `window.google.accounts.id` is
// already available on the very first effect tick.
//
// An earlier version of this component mounted the `<div ref={containerRef} />` only behind a
// `!scriptReady` ternary. In the "GIS already warm" case, the effect called `setScriptReady(true)`
// and, in that same synchronous tick, immediately checked `containerRef.current` — which was
// still null, because React hadn't yet committed the render that mounts that div (state updates
// don't apply mid-callback). `renderButton` was silently skipped and never retried: a
// permanently empty box, no error, no loading text. This test guards against reintroducing that
// specific pattern — the ref container must not be conditionally mounted behind `scriptReady`.
test("admin.tsx's Google step-up button container is always mounted, never gated behind `scriptReady`", () => {
  const source = readFileSync(
    fileURLToPath(new URL("../routes/admin.tsx", import.meta.url)),
    "utf8",
  );

  assert.match(source, /<div ref=\{containerRef\}/, "the GIS button container div must exist");

  // The buggy pattern: `!scriptReady ? (<...loading...>) : (<div ref={containerRef} ...`
  // i.e. the ref div appearing only in the "else" branch of a `scriptReady` ternary.
  assert.doesNotMatch(
    source,
    /!scriptReady\s*\?[\s\S]{0,200}:\s*\([\s\S]{0,50}<div ref=\{containerRef\}/,
    "the ref container must be unconditionally rendered (loading state as an overlay, not a replacement) " +
      "or the GIS button can silently fail to render when the script is already loaded on mount",
  );
});
