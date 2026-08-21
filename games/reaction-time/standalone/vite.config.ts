import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Absolute root (not a path relative to whatever cwd `vite build` happens to be invoked from) —
// this file is meant to be run via `pnpm --filter @owogg/game-reaction-time build`, which sets
// cwd to the package root, one level up from this directory.
const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  // Relative, not "/" (Vite's default) — this bundle is served from the immutable generic path
  // /games/<gameId>/<versionId>/..., never the origin root, and the numeric IDs are only known at
  // publication/live resolution time. A relative base makes index.html reference `./assets/...`,
  // which resolves correctly under whatever prefix the browser's own base URL happens to be — the
  // same reasoning gameServing.ts's /play/:slug redirect doc comment gives for an immutable
  // versioned path.
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
