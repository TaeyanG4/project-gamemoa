import { createRoot } from "react-dom/client";
import { Game } from "../src/game.js";
import { connectStandaloneBridge } from "./bridgeRuntime.js";
import "./style.css";

/**
 * The standalone entry point that runs inside the sandboxed iframe at the immutable generic path
 * `/games/<gameId>/<versionId>/index.html`. `GameHost` delegates to `IframeRuntime`, and the Bridge
 * constructs the `runtime` prop while games/reaction-time/src/game.tsx remains unchanged.
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
