import { useEffect, useState, useMemo, useCallback, useRef, type ComponentType } from "react";
import { useNavigate, Link } from "react-router";
import { loadGame, gameManifests } from "../catalog/registry";
import { useIsGameDisabled } from "../catalog/gameAvailability";
import {
  formatScore,
  type GameRuntimeContext,
  type GameResult,
  type GameProps,
} from "@owogg/game-sdk";
import {
  saveLocalBestScore,
  submitScoreApi,
  extractPlayTokenFromLocation,
  fetchLeaderboardApi,
} from "../scores/api";
import { getReactionTierById } from "@owogg/shared";
import { useAuth } from "../auth";
import { usePersonalization } from "../personalization";
import { useI18n } from "../i18n/I18nContext";
import { getLocalizedGameContent } from "../catalog/localizedGameContent";
import { localizedDifficultyLabel } from "../catalog/difficultyLabels";
import { GameThumbnail } from "../../components/ui/GameThumbnail";
import { XIcon } from "../../components/ui/XIcon";
import { LegacyReactRuntime } from "./runtime/LegacyReactRuntime";
import { IframeRuntime } from "./runtime/IframeRuntime";
import { resolvePresentationLayout } from "./presentationLayoutResolver";
import {
  SYSTEM_GAME_RELEASES,
  type SystemGameRelease,
} from "./runtime/systemGameReleaseMap.generated";
import { officialGameEntryUrl } from "../../lib/api/config";
import type { Dictionary } from "../i18n/dictionary";
import type { LeaderRecord } from "@owogg/contracts";
import {
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  UserCheck,
  Copy,
  Trophy,
} from "lucide-react";

export type SubmissionState = "idle" | "guest" | "submitting" | "success" | "error";

/** Exported for direct unit testing (apps/web/app/test/gameHostMetadata.test.ts) — the web test
 * suite has no DOM renderer, so these pure formatting helpers are the part of the result-overlay
 * logic that can actually be regression-tested without one. */
export function formatMetadataKey(key: string, dict: Dictionary["gamePlay"]): string {
  const map: Record<string, string> = {
    wpm: dict.metadataWpm,
    cpm: dict.metadataCpm,
    accuracy: dict.metadataAccuracy,
    correctChars: dict.metadataCorrectChars,
    incorrectChars: dict.metadataIncorrectChars,
    totalTypedChars: dict.metadataTotalTypedChars,
    durationMs: dict.metadataDurationMs,
    targetsHit: dict.metadataTargetsHit,
    misses: dict.metadataMisses,
    level: dict.metadataLevel,
    // aim-test: games/aim-test/src/game.tsx's runtime.complete metadata.
    targets: dict.metadataTargets,
    avgPerTargetMs: dict.metadataAvgPerTargetMs,
    // memory-test: games/memory-test/src/ui/MemoryGameUI.tsx's runtime.complete metadata.
    sequenceLength: dict.metadataSequenceLength,
    grade: dict.metadataGrade,
  };
  return map[key] ?? key;
}

export function formatMetadataValue(key: string, value: unknown): string {
  if (key === "accuracy" && typeof value === "number") {
    return `${value}%`;
  }
  return String(value);
}

/**
 * Which runtime a SYSTEM game's slug plays through — the ONE place that decision is made. Driven
 * entirely by the release map's own presence, not a hardcoded per-slug switch: the map (built at
 * deploy time by scripts/publish-official-game-bundles.ts, see systemGameReleaseMap.generated.ts's
 * own doc comment) already encodes exactly which SYSTEM games have been migrated to a standalone
 * iframe bundle, so re-deriving that list here would just be a second copy that could drift.
 * Deliberately NOT read off GameDefinition/GameManifest — the release map is deployment/runtime
 * state (which published bundle version is currently live), not catalog metadata a game's own
 * manifest should ever carry.
 *
 * A slug absent from the map — because it was never migrated (aim-test/memory-test/typing-test
 * today), or because a deploy's publish step failed and left the previous map in place — always
 * resolves to "legacy", never a broken iframe URL. That fallback is what makes "publish
 * failed/missing hash → the new iframe URL is never deployed" hold structurally, not just by
 * convention: GameHost has no code path that renders IframeRuntime without a release map entry to
 * point it at.
 */
export function resolveGameRuntimeKind(
  slug: string,
  releases: Readonly<Record<string, SystemGameRelease>>,
): "iframe" | "legacy" {
  return releases[slug] ? "iframe" : "legacy";
}

/**
 * Whether a difficulty-selector change should force IframeRuntime to remount (a fresh
 * `attemptKey`, and therefore a fresh HOST_INIT carrying the new `difficultyId`) — the Game
 * Bridge's bootstrap is a one-time handshake, so an already-connected iframe has no way to learn
 * a NEW difficulty short of a full reload (see the effect in GameHost that calls this).
 *
 * `previousDifficultyId` is `undefined` specifically for "no iframe attempt has been tracked yet
 * for this slug" (a fresh mount, or just navigated here) — that case always returns `false`: the
 * very first mount already reads the CURRENT `selectedDifficultyId` via the `difficultyId` prop,
 * so forcing an extra remount before anything has even loaded once would be pure waste.
 * `hasDifficultyTiers` gates every other game (memory-test, typing-test, and reaction-time today)
 * out entirely — an iframe-runtime game with no difficulty tiers has no selector to change in the
 * first place, so this must never fire for it even if some caller mistakenly passed a difficulty
 * value.
 */
export function shouldRemountIframeOnDifficultyChange(
  previousDifficultyId: string | undefined,
  nextDifficultyId: string,
  context: { runtimeKind: "iframe" | "legacy"; hasDifficultyTiers: boolean },
): boolean {
  if (context.runtimeKind !== "iframe" || !context.hasDifficultyTiers) return false;
  if (previousDifficultyId === undefined) return false;
  return previousDifficultyId !== nextDifficultyId;
}

/**
 * Adapts the Game Bridge's reduced GAME_COMPLETE payload ({score?, metadata?}) into the full
 * GameResult shape runtime.complete (below) already expects, so the iframe path can feed the exact
 * same score/local-best/leaderboard/share pipeline LegacyReactRuntime's games use — no duplicated
 * submission logic, no changed /api/scores contract.
 *
 * Returns null for a completion with no score: runtime.complete's downstream (saveLocalBestScore,
 * handleScoreSubmission) has nothing meaningful to do with an absent score, so GameHost simply
 * doesn't call it rather than synthesizing a fake one (mirrors CreatorGameHost's own `result.score
 * !== undefined` guard around its score-submission call).
 *
 * gameId/sessionId/durationMs/clientStartedAt/clientEndedAt are all placeholder-filled where the
 * Bridge doesn't carry them: GameHost's runtime.complete only ever reads `.score`/`.metadata` off
 * its argument (see the result-overlay JSX and handleScoreSubmission below) — nothing consumes the
 * placeholders, so synthesizing them here has zero behavioral effect while still satisfying
 * GameResult's required shape.
 */
export function buildGameResultFromBridgeComplete(
  bridgeResult: { score?: number; metadata?: Record<string, unknown> },
  context: { slug: string; sessionId: string },
): GameResult | null {
  if (bridgeResult.score === undefined) return null;
  const now = Date.now();
  return {
    gameId: context.slug,
    sessionId: context.sessionId,
    score: bridgeResult.score,
    durationMs: 0,
    ...(bridgeResult.metadata !== undefined ? { metadata: bridgeResult.metadata } : {}),
    clientStartedAt: now,
    clientEndedAt: now,
  };
}

// Metadata keys that get their own dedicated presentation elsewhere in the result screen (e.g.
// "tier" renders as a colored badge below the score, "rounds" is the raw per-round ms array used
// only for the tier calculation) or aren't meaningful to show as a raw key/value pair ("mode" is
// an internal typing-test mode id, e.g. "ko-short"; "difficultyId" is aim-test's own internal tier
// id, e.g. "hard" — already visible via the difficulty selector in the header, not something a
// second raw grid row adds anything to) — kept out of the generic key/value grid.
export const METADATA_GRID_EXCLUDED_KEYS = new Set(["tier", "rounds", "mode", "difficultyId"]);

// Today's fallback for every shipped game (none declares `presentation` yet — see
// presentationLayoutResolver.ts's own doc comment): the exact `frameClassName` restored in #44,
// unchanged. Kept as a named constant rather than inlined so the one call site building the
// iframe's actual layout props (below) can't drift from it by accident.
const LEGACY_IFRAME_FRAME_CLASS_NAME = "h-[70vh] min-h-[480px] max-h-[720px] w-full";

/**
 * Measures a DOM element's content box, live across resizes. The one piece of DOM measurement
 * `resolvePresentationLayout` itself deliberately has none of (pure function, no DOM — see its
 * own doc comment); this is the thin wiring around it, same split as
 * transitionalCreatorGameResolver.ts's resolveGameSource/useGameSourceResolution.
 *
 * Returns a callback ref rather than accepting a `useRef` object: the element this measures
 * (the iframe area, below) is conditionally rendered — not present on GameHost's very first
 * render, since `isLoading` starts `true` even for the iframe runtime kind. An object ref's
 * `.current` mutation is invisible to `useEffect`'s dependency array, so an effect keyed on a
 * stable ref object would only ever attach a ResizeObserver if the element happened to already
 * exist on the first render. A callback ref fires on every actual attach/detach, which is what
 * lets the `node` state (and therefore the effect below) update correctly whenever the element
 * later mounts.
 */
function useElementSize(): [
  (node: HTMLElement | null) => void,
  { width: number; height: number } | null,
] {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return [setNode, size];
}

export interface GameHostProps {
  slug: string;
}

/**
 * Owns the full built-in-game play lifecycle — loading, difficulty, the runtime session handed to
 * the game module, score submission, the result/leaderboard/share overlay, and retry — for
 * whichever OwOGG UI chrome surrounds any runtime, legacy or (eventually) iframe. See
 * runtime/LegacyReactRuntime.tsx for why "which runtime renders the actual game surface" is
 * deliberately the one thing carved out of this component instead.
 *
 * Split out of routes/game-slug.tsx (formerly one 740-line route component) so the route file is
 * just param extraction; this is everything else, unchanged. No behavior or UI changed by the
 * split itself — see the PR this shipped in for the equivalence tests that pin that down.
 */
export function GameHost({ slug }: GameHostProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const { dict } = useI18n();

  const [GameComponent, setGameComponent] = useState<ComponentType<GameProps> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<GameResult | null>(null);
  // Reaction-time only: badge derived from metadata.tier (see games/reaction-time/src/game.tsx).
  // Other games don't set this metadata key, so this stays undefined for them.
  const resultTier = useMemo(() => {
    const tierId = result?.metadata?.tier;
    return typeof tierId === "string" ? getReactionTierById(tierId) : undefined;
  }, [result]);

  // Attempt Lifecycle State & Auth Eligibility
  const [attemptKey, setAttemptKey] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID());
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Result-screen leaderboard preview — only fetched for games that opt in
  // (manifest.supportsLeaderboard), so casual games where rank doesn't matter can skip it.
  const [resultLeaderboard, setResultLeaderboard] = useState<LeaderRecord[] | null>(null);

  const manifest = useMemo(() => gameManifests.find((m) => m.slug === slug), [slug]);
  const localizedTitle = manifest ? getLocalizedGameContent(dict, manifest).title : undefined;
  const isDisabled = useIsGameDisabled(manifest?.id ?? slug);

  // See resolveGameRuntimeKind's own doc comment — the release map's presence is the only signal
  // that decides IframeRuntime vs. LegacyReactRuntime for this slug.
  const release = SYSTEM_GAME_RELEASES[slug];
  const runtimeKind = resolveGameRuntimeKind(slug, SYSTEM_GAME_RELEASES);

  // Presentation layout — see presentationLayoutResolver.ts's own doc comment for the math, and
  // useElementSize's for why this is a callback ref. `iframeAreaRef` goes on the innermost box
  // that actually bounds the iframe (the `p-6`-padded wrapper below), not some outer container:
  // that's the one measurement that needs no hardcoded knowledge of the max-w-6xl/rounded-card
  // chrome around it. `availableSize` stays null until the first ResizeObserver callback lands,
  // which resolvePresentationLayout's caller below treats as "legacy" — never a bogus 0x0 layout
  // for the one render before a real measurement exists.
  const [iframeAreaRef, availableSize] = useElementSize();
  const presentationLayout = useMemo(
    () =>
      availableSize
        ? resolvePresentationLayout(manifest?.presentation, availableSize)
        : ({ kind: "legacy" } as const),
    [manifest?.presentation, availableSize],
  );
  // Game preference ∩ Platform constraints ∩ Actual available viewport → Host decides (see
  // GamePresentation's own doc comment). "legacy" is every shipped game today: the exact
  // frameClassName restored in #44, untouched — no frameStyle/iframeStyle at all, so GameFrame's
  // rendering for this branch is byte-identical to before this PR.
  const iframeFrameClassName =
    presentationLayout.kind === "legacy" ? LEGACY_IFRAME_FRAME_CLASS_NAME : "mx-auto max-w-full";
  const iframeFrameStyle =
    presentationLayout.kind === "legacy"
      ? undefined
      : { width: presentationLayout.displayWidth, height: presentationLayout.displayHeight };
  // Only "fixed" mode needs this: the iframe element itself is sized to the game's own logical
  // design resolution (so its document sees that as its viewport) and then visually scaled down
  // to fit iframeFrameStyle's box — see GameFrame.tsx's own iframeStyle doc comment.
  const iframeElementStyle =
    presentationLayout.kind === "fixed"
      ? {
          width: presentationLayout.logicalWidth,
          height: presentationLayout.logicalHeight,
          transform: `scale(${presentationLayout.scale})`,
          transformOrigin: "top left" as const,
        }
      : undefined;

  // Difficulty selection — only meaningful for games with manifest.difficulty. Resets to the
  // game's default whenever navigating between games. A change here only affects the NEXT
  // attempt: for LegacyReactRuntime that's handleStart inside the game component (an
  // already-in-progress round keeps whatever it captured when it started, never flips difficulty
  // mid-round); for IframeRuntime, "next attempt" means the next iframe mount — see the
  // iframeAttemptDifficultyRef effect below for why an already-mounted iframe can't be updated
  // live.
  const [selectedDifficultyId, setSelectedDifficultyId] = useState<string>("normal");
  // Tracks the difficulty the CURRENTLY-mounted iframe attempt was actually bootstrapped with.
  // undefined means "no iframe attempt tracked yet for this slug" — see the effect below, which is
  // the only other place this ref is written.
  const iframeAttemptDifficultyRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    setSelectedDifficultyId(manifest?.difficulty?.defaultLevelId ?? "normal");
    iframeAttemptDifficultyRef.current = undefined;
  }, [manifest]);

  // Load Game Module — skipped entirely for a slug the release map resolves to "iframe": the
  // game's React component never enters this host's own JS bundle at all in that case (it runs
  // standalone, inside the iframe's own bundle instead), so there is no module for loadGame() to
  // fetch. GameComponent simply stays null and the iframe branch below never reads it.
  useEffect(() => {
    if (runtimeKind === "iframe") {
      setIsLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    extractPlayTokenFromLocation();

    async function init() {
      try {
        setIsLoading(true);
        setError(null);
        const module = await loadGame(slug);

        if (!isMounted) return;

        if (!module) {
          setError(dict.gamePlay.errorGameNotFound);
        } else {
          setGameComponent(() => module.Game);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load game:", err);
          setError(dict.gamePlay.errorLoadFailed);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void init();

    return () => {
      isMounted = false;
    };
    // loadGame() dynamic-imports the module, which the bundler caches per specifier — re-running
    // this on a locale switch is just a cache hit, not a real re-fetch, so it's safe to depend on
    // these two dict strings the same way exhaustive-deps wants.
  }, [slug, runtimeKind, dict.gamePlay.errorGameNotFound, dict.gamePlay.errorLoadFailed]);

  // Handle Score Submission (Authenticated Attempts Only)
  const handleScoreSubmission = useCallback(
    async (scoreToSubmit: number) => {
      setSubmissionState("submitting");
      setSubmissionError(null);

      try {
        const payload: {
          gameId: string;
          score: number;
          nickname?: string;
          difficulty?: string;
        } = {
          gameId: slug,
          score: scoreToSubmit,
          difficulty: selectedDifficultyId,
        };

        const res = await submitScoreApi(payload);

        if (res && res.success) {
          setSubmissionState("success");
        } else {
          setSubmissionState("error");
          setSubmissionError(dict.gamePlay.errorSubmitFailed);
        }
      } catch {
        setSubmissionState("error");
        setSubmissionError(dict.gamePlay.errorNetworkSubmitFailed);
      }
    },
    [
      slug,
      selectedDifficultyId,
      dict.gamePlay.errorSubmitFailed,
      dict.gamePlay.errorNetworkSubmitFailed,
    ],
  );

  // Reset / Retry Game Attempt
  const handleRetryGame = useCallback(() => {
    setResult(null);
    setSubmissionState("idle");
    setSubmissionError(null);
    setResultLeaderboard(null);
    setSessionId(crypto.randomUUID());
    setAttemptKey((prev) => prev + 1);
  }, []);

  // Forces a fresh iframe mount when the difficulty selector changes for an iframe-runtime game
  // that has real difficulty tiers (aim-test today). The Game Bridge's HOST_INIT bootstrap is a
  // one-time handshake — unlike LegacyReactRuntime, which re-reads runtime.difficultyId fresh
  // every time the game component itself calls handleStart, an already-connected iframe has no
  // way to learn a NEW difficulty short of a full reload. Reusing handleRetryGame's own reset
  // (new sessionId, cleared result/leaderboard, bumped attemptKey) is what remounts IframeRuntime
  // — see its `key={attemptKey}` in GameFrame — with the new value baked into its next HOST_INIT.
  //
  // Skips the very first render for a slug (iframeAttemptDifficultyRef.current still undefined,
  // reset by the manifest effect above): the FIRST iframe mount already reads the current
  // selectedDifficultyId via the `difficultyId` prop passed to IframeRuntime below, so forcing an
  // extra remount before anything has even loaded once would be pure waste.
  useEffect(() => {
    const hasDifficultyTiers = Boolean(manifest?.difficulty);
    if (
      shouldRemountIframeOnDifficultyChange(
        iframeAttemptDifficultyRef.current,
        selectedDifficultyId,
        {
          runtimeKind,
          hasDifficultyTiers,
        },
      )
    ) {
      handleRetryGame();
    }
    if (runtimeKind === "iframe" && hasDifficultyTiers) {
      iframeAttemptDifficultyRef.current = selectedDifficultyId;
    }
  }, [selectedDifficultyId, runtimeKind, manifest, handleRetryGame]);

  // Fetch a compact leaderboard preview as soon as the game ends (not gated on score
  // submission succeeding — guests and rejected submissions still get competitive context).
  // Skipped entirely for games with supportsLeaderboard: false.
  useEffect(() => {
    if (!result || !manifest?.supportsLeaderboard) return;
    let isMounted = true;
    fetchLeaderboardApi(slug, selectedDifficultyId)
      .then((records) => {
        if (isMounted) setResultLeaderboard(records.slice(0, 5));
      })
      .catch(() => {
        if (isMounted) setResultLeaderboard([]);
      });
    return () => {
      isMounted = false;
    };
  }, [result, manifest, slug, selectedDifficultyId]);

  // Share Result — scoped to X (official web intent) and a screenshot-copy of the result card.
  // A dedicated Discord button used to sit here too, but it only ever copied the same text a
  // Discord message would need — functionally identical to the screenshot-copy button once that
  // button started including the share text alongside the image, so it was dropped as redundant
  // rather than kept as a second "copy" action with a different icon. Web Share API / Instagram
  // / TikTok remain out of scope (operator decision). X still attaches the screenshot by default
  // (see captureScreenshotBlob) — X has no API for a page to attach an arbitrary image to its
  // compose window, so "attach by default" means "copy it to the clipboard so the user can
  // paste it in", which is the most a web page is allowed to do.
  const shareCardRef = useRef<HTMLDivElement>(null);
  const [xShareState, setXShareState] = useState<"idle" | "sharing" | "shared">("idle");
  const [screenshotState, setScreenshotState] = useState<
    "idle" | "copying" | "copied" | "downloaded" | "error"
  >("idle");

  const buildShareText = useCallback(() => {
    if (!result || !manifest) return null;
    const scoreText = formatScore(result.score, manifest.scoreConfig);
    const title = getLocalizedGameContent(dict, manifest).title;
    return dict.gamePlay.shareText.replace("{title}", title).replace("{score}", scoreText);
  }, [result, manifest, dict]);

  const captureScreenshotBlob = useCallback(async (): Promise<Blob | null> => {
    if (!shareCardRef.current) return null;
    const { toBlob } = await import("html-to-image");
    return await toBlob(shareCardRef.current, { pixelRatio: 2 });
  }, []);

  const handleShareX = useCallback(async () => {
    const shareText = buildShareText();
    if (!shareText) return;
    setXShareState("sharing");

    // Best-effort — X's web intent has no parameter for attaching an image, so this is the
    // closest a web page can get to "attach a screenshot": copy it to the clipboard and let the
    // user paste it into the compose window that's about to open. Never blocks the share itself.
    if (navigator.clipboard && typeof window.ClipboardItem !== "undefined") {
      try {
        const blob = await captureScreenshotBlob();
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        }
      } catch (err) {
        console.error("Screenshot copy before X share failed (non-fatal):", err);
      }
    }

    const shareUrl = `${window.location.origin}/games/${slug}`;
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(intentUrl, "_blank", "noopener,noreferrer");
    setXShareState("shared");
    setTimeout(() => setXShareState("idle"), 4000);
  }, [buildShareText, captureScreenshotBlob, slug]);

  const handleCopyScreenshot = useCallback(async () => {
    setScreenshotState("copying");
    try {
      const blob = await captureScreenshotBlob();
      if (!blob) throw new Error("html-to-image returned no blob");

      if (navigator.clipboard && typeof window.ClipboardItem !== "undefined") {
        // A single ClipboardItem can carry multiple representations of the same copy — Discord's
        // (and most chat apps') paste handler picks the image when one is present (attaches it
        // as a file) while still making the share text available to anything that reads
        // text/plain instead, so one copy covers both "paste an image" and "paste a message"
        // without the user needing a second, separate action for text.
        const shareText = buildShareText();
        const shareUrl = `${window.location.origin}/games/${slug}`;
        const items: Record<string, Blob> = { "image/png": blob };
        if (shareText) {
          items["text/plain"] = new Blob([`${shareText} ${shareUrl}`], { type: "text/plain" });
        }
        await navigator.clipboard.write([new ClipboardItem(items)]);
        setScreenshotState("copied");
      } else {
        // Clipboard image writes aren't universally supported (older browsers, some mobile
        // in-app browsers) — fall back to a plain download instead of failing silently.
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `owogg-${slug}-result.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setScreenshotState("downloaded");
      }
    } catch (err) {
      console.error("Screenshot copy failed:", err);
      setScreenshotState("error");
    } finally {
      setTimeout(() => setScreenshotState("idle"), 2500);
    }
  }, [captureScreenshotBlob, buildShareText, slug]);

  const { recordRecentPlay } = usePersonalization();

  // Game Runtime Context
  const runtime = useMemo<GameRuntimeContext>(
    () => ({
      sessionId,
      user: user ? { id: String(user.id), displayName: user.nickname } : null,
      difficultyId: selectedDifficultyId,
      emit: (event) => {
        if (event && event.type === "game_started") {
          void recordRecentPlay(slug);
        }
      },
      complete: async (gameResult) => {
        setResult(gameResult);

        const lowerIsBetter = manifest?.scoreConfig?.direction === "asc";
        saveLocalBestScore(slug, gameResult.score, lowerIsBetter);

        // Read isAuthenticated live at completion time rather than a value frozen at round
        // start — a frozen snapshot (the previous approach) went stale whenever the session
        // check hadn't resolved yet at mount, permanently showing the guest notice to an
        // already-logged-in player until their next retry happened to re-capture it correctly.
        if (isAuthenticated) {
          await handleScoreSubmission(gameResult.score);
        } else {
          setSubmissionState("guest");
        }
      },
      cancel: () => {
        void navigate("/games");
      },
    }),
    [
      sessionId,
      user,
      isAuthenticated,
      selectedDifficultyId,
      navigate,
      slug,
      manifest,
      handleScoreSubmission,
      recordRecentPlay,
    ],
  );

  // IframeRuntime callbacks — the Bridge-driven counterpart to the `runtime` object above.
  // Deliberately funnel into the SAME `runtime.complete`/`recordRecentPlay`/`navigate` calls
  // LegacyReactRuntime's games already use, rather than a parallel result pipeline: score
  // submission, local-best tracking, the leaderboard preview effect, and share all stay exactly as
  // they are today (see buildGameResultFromBridgeComplete's own doc comment for why this is safe).
  const handleIframeStarted = useCallback(() => {
    void recordRecentPlay(slug);
  }, [recordRecentPlay, slug]);

  const handleIframeComplete = useCallback(
    (bridgeResult: { score?: number; metadata?: Record<string, unknown> }) => {
      const gameResult = buildGameResultFromBridgeComplete(bridgeResult, { slug, sessionId });
      if (gameResult) void runtime.complete(gameResult);
    },
    [runtime, slug, sessionId],
  );

  const handleIframeError = useCallback(
    (message?: string) => {
      console.error("Game bridge error:", slug, message);
      setError(dict.gamePlay.errorLoadFailed);
    },
    [slug, dict.gamePlay.errorLoadFailed],
  );

  // Game Result & Score Submission Overlay — shared verbatim between the iframe and legacy
  // branches below (result/submissionState/resultLeaderboard/share state are all populated
  // identically by either runtime's own path into runtime.complete, so the overlay itself has no
  // reason to differ). overflow-y-auto + min-h-full (rather than a fixed-height flex-center with
  // no scroll) is what actually fixes two things at once: the result staying visually centered
  // when it fits, and the retry/back-to-list buttons no longer clipping off the bottom edge when
  // the content (card + status + leaderboard + share row) is taller than the viewport —
  // previously there was nowhere for that overflow to go.
  const resultOverlay = result ? (
    <div className="absolute inset-0 z-50 overflow-y-auto bg-black/90">
      <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center md:p-8">
        <h3 className="text-3xl font-extrabold text-white">{dict.gamePlay.resultTitle}</h3>

        {/* The score card is now its own self-contained box — everything inside this
            ref is what handleCopyScreenshot captures, and owogg.com is genuinely its
            last/bottom element now that submission status, leaderboard, and share
            buttons live in a separate section below instead of the same bordered box. */}
        <div
          ref={shareCardRef}
          className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-6"
        >
          <div className="mb-3 flex items-center justify-center gap-2">
            <GameThumbnail
              thumbnail={manifest?.thumbnail ?? ""}
              title={localizedTitle ?? ""}
              accent={manifest?.accent}
              className="h-6 w-6"
              rounded="rounded-md"
            />
            <span className="text-sm font-bold text-text-secondary">{localizedTitle}</span>
          </div>
          <p className="text-text-secondary text-sm mb-1">
            {isAuthenticated ? dict.gamePlay.finalScoreLabel : dict.gamePlay.deviceBestLabel}
          </p>
          <p className="text-5xl font-black text-brand mb-1">
            {formatScore(result.score, manifest?.scoreConfig)}
          </p>

          {resultTier && (
            <span
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-black text-white shadow-md"
              style={{
                backgroundImage: `linear-gradient(to right, ${resultTier.colorFrom}, ${resultTier.colorTo})`,
              }}
            >
              {resultTier.label}
            </span>
          )}

          {/* Metadata Formatters */}
          {result.metadata &&
            Object.entries(result.metadata).filter(([key]) => !METADATA_GRID_EXCLUDED_KEYS.has(key))
              .length > 0 && (
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/80">
                {Object.entries(result.metadata)
                  .filter(([key]) => !METADATA_GRID_EXCLUDED_KEYS.has(key))
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="bg-surface/50 p-2.5 rounded-xl border border-border/40"
                    >
                      <p className="text-xs text-text-muted font-bold mb-0.5">
                        {formatMetadataKey(key, dict.gamePlay)}
                      </p>
                      <p className="font-extrabold text-text-primary text-sm">
                        {formatMetadataValue(key, value)}
                      </p>
                    </div>
                  ))}
              </div>
            )}

          <p className="mt-6 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            owogg.com
          </p>
        </div>

        {/* Everything below is deliberately outside shareCardRef (not part of the
            screenshot) — submission status, leaderboard, share actions. Only shown to
            guests (submissionState only ever becomes "guest" when signed out — see
            runtime.complete), so an already-logged-in player never sees it. */}
        <div className="w-full max-w-md flex flex-col gap-4">
          {submissionState === "guest" && (
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-xs font-bold text-text-secondary">
                {dict.gamePlay.guestNoticeTitle}
              </span>
              <span className="text-[11px] text-text-muted">{dict.gamePlay.guestNoticeBody}</span>
              <button
                type="button"
                onClick={openLoginModal}
                className="mt-1 px-4 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
              >
                {dict.gamePlay.guestLoginCta}
              </button>
            </div>
          )}
          {submissionState === "submitting" && (
            <span className="inline-flex items-center justify-center gap-2 text-xs font-bold text-brand animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              {dict.gamePlay.submittingLabel}
            </span>
          )}
          {submissionState === "success" && (
            <span className="inline-flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              {dict.gamePlay.successLabel}
            </span>
          )}
          {submissionState === "error" && (
            <div className="flex flex-col items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400">
                <AlertCircle className="w-4 h-4" />
                {submissionError || dict.gamePlay.errorSubmitFallback}
              </span>
              <button
                type="button"
                onClick={() => void handleScoreSubmission(result.score)}
                className="px-3 py-1 bg-surface border border-border hover:bg-surface-overlay text-text-primary text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                {dict.gamePlay.retrySubmitCta}
              </button>
            </div>
          )}

          {/* Leaderboard preview — skipped for games with supportsLeaderboard: false */}
          {manifest?.supportsLeaderboard && resultLeaderboard && (
            <div className="rounded-2xl border border-border bg-surface-raised p-4 text-left">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-text-muted">
                <Trophy className="h-3.5 w-3.5 text-accent-yellow" />
                {dict.gamePlay.leaderboardTitle}
              </p>
              {resultLeaderboard.length === 0 ? (
                <p className="py-3 text-center text-xs text-text-muted">
                  {dict.gamePlay.leaderboardEmpty}
                </p>
              ) : (
                <ol className="space-y-1">
                  {resultLeaderboard.map((record, i) => (
                    <li
                      key={record.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-1.5 text-xs"
                    >
                      {record.userId !== null && record.userId !== undefined ? (
                        <Link
                          to={`/users/${record.userId}`}
                          className="flex items-center gap-2 truncate font-semibold text-brand-light hover:underline"
                        >
                          <span className="w-4 shrink-0 text-text-muted">#{i + 1}</span>
                          <span className="truncate">{record.playerName}</span>
                        </Link>
                      ) : (
                        <span className="flex items-center gap-2 truncate font-semibold text-text-secondary">
                          <span className="w-4 shrink-0 text-text-muted">#{i + 1}</span>
                          <span className="truncate">{record.playerName}</span>
                        </span>
                      )}
                      <span className="shrink-0 font-black text-brand-light">
                        {record.formattedScore}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <Link
                to={`/games/${slug}/ranking`}
                className="mt-2 inline-block text-[11px] font-bold text-brand-light hover:underline"
              >
                {dict.gamePlay.viewFullRanking}
              </Link>
            </div>
          )}

          {/* Share row — icon-only (X's official wordmark, a plain copy icon for the
              screenshot+text action) with a native title tooltip standing in for the
              text labels these used to carry. A brief checkmark swap is the only
              per-button feedback now that there's no label text to change; the X
              button additionally gets a one-line hint below the row since "screenshot
              copied, paste it yourself" needs actual explaining. */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void handleShareX()}
              title={dict.gamePlay.shareXCta}
              aria-label={dict.gamePlay.shareXCta}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary cursor-pointer"
            >
              {xShareState === "shared" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <XIcon className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => void handleCopyScreenshot()}
              disabled={screenshotState === "copying"}
              title={dict.gamePlay.screenshotCopyCta}
              aria-label={dict.gamePlay.screenshotCopyCta}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary cursor-pointer disabled:opacity-50"
            >
              {screenshotState === "copying" ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : screenshotState === "copied" || screenshotState === "downloaded" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : screenshotState === "error" ? (
                <AlertCircle className="h-5 w-5 text-rose-400" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
          </div>
          {xShareState === "shared" && (
            <p className="-mt-2 text-[11px] font-semibold text-text-muted">
              {dict.gamePlay.shareXScreenshotHint}
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleRetryGame}
            className="px-8 py-3 bg-brand text-white rounded-xl font-extrabold hover:bg-brand-light shadow-lg shadow-brand/25 transition-all cursor-pointer"
          >
            {dict.gamePlay.retryGameCta}
          </button>
          <button
            type="button"
            onClick={() => void navigate("/games")}
            className="px-8 py-3 bg-surface text-text-primary border border-border rounded-xl font-extrabold hover:bg-surface-raised transition-colors cursor-pointer"
          >
            {dict.gamePlay.backToListResult}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center flex-1 select-none">
        <AlertCircle className="w-16 h-16 text-accent-red mb-6" />
        <h2 className="text-2xl font-bold mb-4">{error}</h2>
        <button
          type="button"
          onClick={() => void navigate("/games")}
          className="px-6 py-3 bg-surface-raised border border-border rounded-lg hover:bg-surface-overlay transition-colors cursor-pointer"
        >
          {dict.gamePlay.backToList}
        </button>
      </div>
    );
  }

  // Admin kill switch (see adminGames.ts) — blocks play even if the client already finished
  // loading the game bundle before an admin disabled it mid-session.
  if (isDisabled) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center flex-1 select-none text-center">
        <AlertCircle className="w-16 h-16 text-accent-yellow mb-6" />
        <h2 className="text-2xl font-bold mb-2">{dict.gamePlay.gameDisabledTitle}</h2>
        <p className="mb-6 max-w-sm text-sm text-text-muted">{dict.gamePlay.gameDisabledBody}</p>
        <button
          type="button"
          onClick={() => void navigate("/games")}
          className="px-6 py-3 bg-surface-raised border border-border rounded-lg hover:bg-surface-overlay transition-colors cursor-pointer"
        >
          {dict.gamePlay.backToList}
        </button>
      </div>
    );
  }

  // Auth Protection Enforcer
  const isAuthBlocked = manifest?.requiresAuth && !isAuthenticated;

  return (
    <div className="flex flex-col flex-1 bg-[#09090b] select-none">
      {/* Game Header */}
      <div className="h-14 border-b border-border bg-surface flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => void navigate("/games")}
            className="p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">{dict.gamePlay.back}</span>
          </button>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-3">
            <GameThumbnail
              thumbnail={manifest?.thumbnail ?? ""}
              title={localizedTitle ?? ""}
              accent={manifest?.accent}
              className="h-6 w-6"
              rounded="rounded-md"
            />
            <span className="font-bold">{localizedTitle ?? dict.gamePlay.loadingTitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {manifest?.difficulty && (
            <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-surface-raised p-1">
              {manifest.difficulty.levels.map((level) => {
                const isSelected = level.id === selectedDifficultyId;
                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => setSelectedDifficultyId(level.id)}
                    aria-pressed={isSelected}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-brand text-white shadow-sm"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-overlay"
                    }`}
                  >
                    {localizedDifficultyLabel(level.id, level.label, dict.gamePlay)}
                  </button>
                );
              })}
            </div>
          )}

          {manifest?.supportsLeaderboard && (
            <Link
              to={`/games/${slug}/ranking`}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <Trophy className="h-4 w-4 text-accent-yellow" />
              <span className="hidden sm:inline">{dict.gameRanking.eyebrow}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Game Area Container */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-brand/30 border-t-brand rounded-full animate-spin" />
            <p className="text-text-secondary font-medium animate-pulse">
              {dict.gamePlay.loadingBody}
            </p>
          </div>
        ) : isAuthBlocked ? (
          <div className="w-full max-w-md bg-surface-raised rounded-3xl border border-border p-8 text-center shadow-2xl flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand/10 text-brand flex items-center justify-center">
              <UserCheck className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black text-text-primary">
              {dict.gamePlay.authRequiredTitle}
            </h3>
            <p className="text-sm text-text-secondary">{dict.gamePlay.authRequiredBody}</p>
            <button
              onClick={openLoginModal}
              className="w-full py-3 bg-brand text-white font-extrabold rounded-2xl shadow-lg shadow-brand/30 hover:scale-105 transition-all cursor-pointer mt-2"
            >
              {dict.gamePlay.authRequiredCta}
            </button>
          </div>
        ) : runtimeKind === "iframe" ? (
          release ? (
            <div className="w-full max-w-6xl bg-surface-raised rounded-xl shadow-2xl overflow-hidden relative border border-border/50">
              {resultOverlay}
              <div className="p-6" ref={iframeAreaRef}>
                <IframeRuntime
                  src={officialGameEntryUrl(slug, release)}
                  title={localizedTitle ?? slug}
                  attemptKey={attemptKey}
                  // IframeRuntime/GameFrame render the iframe at `h-full w-full` of whatever this
                  // wraps — with no sizing at all that collapses to a near-zero height, since
                  // nothing here otherwise constrains it. LegacyReactRuntime's games never hit
                  // this because each sizes its own arena internally (e.g. aim-test's own
                  // `aspect-[16/10] min-h-[380px]` on its play area) — GameHost has no visibility
                  // into what an iframe-runtime game renders internally, so absent a presentation
                  // preference this falls back to a shared, generously-sized responsive viewport
                  // instead (LEGACY_IFRAME_FRAME_CLASS_NAME, restored in #44): roughly 70% of
                  // viewport height, never below a legacy-game-sized 480px, never beyond 720px on
                  // very tall screens. See presentationLayoutResolver.ts for the general case.
                  frameClassName={iframeFrameClassName}
                  frameStyle={iframeFrameStyle}
                  iframeStyle={iframeElementStyle}
                  {...(manifest?.difficulty ? { difficultyId: selectedDifficultyId } : {})}
                  onStarted={handleIframeStarted}
                  onComplete={handleIframeComplete}
                  onCancel={runtime.cancel}
                  onError={handleIframeError}
                />
              </div>
            </div>
          ) : null
        ) : GameComponent ? (
          <div className="w-full max-w-6xl bg-surface-raised rounded-xl shadow-2xl overflow-hidden relative border border-border/50">
            {resultOverlay}
            <div className="p-6">
              <LegacyReactRuntime
                GameComponent={GameComponent}
                runtime={runtime}
                attemptKey={attemptKey}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
