import { test, expect } from "@playwright/test";
import { SYSTEM_GAME_RELEASES } from "../../apps/web/app/features/game/runtime/systemGameReleaseMap.generated.js";
import { GAME_ORIGIN_URL } from "../config.js";

/**
 * SYSTEM iframe migration — base invariants only (1st E2E PR's own scope). Exercises exactly one
 * migrated SYSTEM game (reaction-time — see e2e/prepareLocalGameOrigin.ts for why it's the one
 * this suite builds a local fixture for) through a REAL browser, checking the handful of DOM-level
 * facts that can't be verified by the pure/unit tests already covering GameHost.tsx,
 * IframeRuntime.tsx, and GameFrame.tsx's own logic:
 *   - an <iframe> actually gets mounted (not just that the component WOULD render one)
 *   - its `sandbox` attribute is exactly the policy GameFrame.GAME_IFRAME_SANDBOX declares, with
 *     no `allow-same-origin` ever added
 *   - its `src` points at the real official-games/<slug>/<version>/ path construction, not a
 *     placeholder
 *   - its rendered height doesn't collapse (the exact regression fixed in PR #44 — see
 *     GameHost.tsx's frameClassName)
 *
 * Deliberately NOT covered here: clicking through the Game Bridge handshake, submitting a score,
 * memory-test/aim-test's own interactions, difficulty switching — see this PR's own scope note;
 * those are a follow-up PR's job once this harness itself is in place.
 */

test.describe("SYSTEM game iframe invariants (reaction-time)", () => {
  test("reaction-time renders through IframeRuntime with the expected sandbox/src/height", async ({
    page,
  }) => {
    const release = SYSTEM_GAME_RELEASES["reaction-time"];
    // Fails loudly rather than silently skipping: an absent release map entry here means
    // e2e/prepareLocalGameOrigin.ts didn't run (or failed) — see e2e/run.ts, which always runs it
    // before Playwright starts.
    expect(
      release,
      "no local release map entry for reaction-time — did e2e/run.ts's prepare step run?",
    ).toBeTruthy();

    await page.goto("/games/reaction-time");

    // GameFrame lazy-mounts the iframe only once the player presses PLAY (see GameFrame.tsx's own
    // doc comment on why: a game bundle can be tens of megabytes, so nothing loads on page view
    // alone) — this is the one interaction this test needs, to reach the iframe at all.
    await page.getByRole("button", { name: "PLAY" }).click();

    const iframe = page.locator("iframe");
    await expect(iframe).toHaveCount(1);

    const sandbox = await iframe.getAttribute("sandbox");
    expect(sandbox).toBe("allow-scripts allow-pointer-lock");
    expect(sandbox).not.toContain("allow-same-origin");

    const src = await iframe.getAttribute("src");
    expect(src).toBe(
      `${GAME_ORIGIN_URL}/official-games/reaction-time/${release!.version}/index.html`,
    );

    const box = await iframe.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(480);
  });
});
