import { createRoot } from "react-dom/client";
import { Game } from "../src/game.js";
import { connectStandaloneBridge } from "./bridgeRuntime.js";
import "./style.css";

/**
 * The standalone entry point — what actually runs inside the sandboxed iframe on
 * play.owogg.com/official-games/reaction-time/<hash>/index.html, in place of GameHost's
 * LegacyReactRuntime + direct GameProps wiring. games/reaction-time/src/game.tsx itself is
 * imported completely unchanged; only how it's mounted and how its `runtime` prop is constructed
 * differ from the LegacyReactRuntime path.
 */
async function main(): Promise<void> {
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("standalone entry is missing #root");

  const { runtime, client } = await connectStandaloneBridge();
  createRoot(rootEl).render(<Game runtime={runtime} />);
  // No async asset pipeline for this game (no images/audio to preload) — the round is playable
  // the instant the first render is committed, so READY fires right after mounting.
  client.ready();
}

void main().catch((err) => {
  console.error("reaction-time standalone bootstrap failed:", err);
});
