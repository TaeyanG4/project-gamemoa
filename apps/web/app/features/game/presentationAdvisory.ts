import type { GamePresentation } from "@owogg/game-sdk";

/**
 * Pure policy for the two remaining Host-side GamePresentation UX decisions
 * GameHost.tsx wires up: whether to show a fullscreen control, and whether to show a
 * mobile/orientation advisory. No DOM, no React — GameHost.tsx's own hooks
 * (useIsMobileLikeEnvironment, useActualOrientation, useFullscreen) are the thin wiring that
 * feeds each function here the platform signal it needs. Exercised directly with plain values in
 * apps/web/app/test/presentationAdvisory.test.ts.
 *
 * Every function here answers "should the Host show something", never "what should happen
 * automatically" — GamePresentation is a preference, and the player always keeps the final say
 * (see GamePresentation's own doc comment, packages/game-sdk/src/contracts/presentation.ts).
 * Nothing here ever locks orientation, forces fullscreen, or blocks PLAY.
 */

/** `presentation === undefined` (every game shipped today) always resolves to `false` here —
 * that's what keeps this PR from changing anything about the four real SYSTEM games' UI. */
export function shouldShowFullscreenControl(
  presentation: GamePresentation | undefined,
  fullscreenApiAvailable: boolean,
): boolean {
  return presentation?.fullscreen.supported === true && fullscreenApiAvailable;
}

export type MobileAdvisory = "none" | "experimental" | "unsupported";

/**
 * `isMobileLikeEnvironment` is the one platform heuristic this reads (a coarse/touch-primary
 * pointer — see GameHost.tsx's useIsMobileLikeEnvironment for the exact signal), deliberately NOT
 * the game's own `inputMethods`: a desktop game whose onClick handlers happen to also fire for
 * touch taps says nothing about whether it was actually designed for a phone screen, and the
 * reverse can be true too — see GamePresentationMobile's own doc comment on why the two fields
 * are independent.
 */
export function resolveMobileAdvisory(
  presentation: GamePresentation | undefined,
  isMobileLikeEnvironment: boolean,
): MobileAdvisory {
  if (!isMobileLikeEnvironment) return "none";
  const support = presentation?.mobile.support;
  if (support === "experimental") return "experimental";
  if (support === "unsupported") return "unsupported";
  return "none"; // "supported", or presentation absent entirely (every shipped game today).
}

export type OrientationAdvisory =
  | { readonly kind: "none" }
  | { readonly kind: "mismatch"; readonly preferred: "portrait" | "landscape" };

/** Only evaluated in a mobile-like environment — a desktop browser's window "orientation" is not
 * a meaningful concept for this advisory (see GameHost.tsx's useActualOrientation, which is only
 * even read once isMobileLikeEnvironment is true). "any" or an absent preference always means
 * "no opinion", matching every game shipped today (which declares no presentation at all). */
export function resolveOrientationAdvisory(
  presentation: GamePresentation | undefined,
  isMobileLikeEnvironment: boolean,
  actualOrientation: "portrait" | "landscape",
): OrientationAdvisory {
  if (!isMobileLikeEnvironment) return { kind: "none" };
  const preferred = presentation?.mobile.orientation;
  if (preferred === undefined || preferred === "any") return { kind: "none" };
  if (preferred === actualOrientation) return { kind: "none" };
  return { kind: "mismatch", preferred };
}
