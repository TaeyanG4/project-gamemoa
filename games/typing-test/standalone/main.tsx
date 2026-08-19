import { createRoot } from "react-dom/client";
import { Game } from "../src/game.js";
import { connectStandaloneBridge } from "./bridgeRuntime.js";
import "./style.css";

async function main(): Promise<void> {
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("standalone entry is missing #root");

  const { runtime, client } = await connectStandaloneBridge();
  createRoot(rootEl).render(<Game runtime={runtime} />);
  client.ready();
}

void main().catch((err) => {
  console.error("typing-test standalone bootstrap failed:", err);
});
