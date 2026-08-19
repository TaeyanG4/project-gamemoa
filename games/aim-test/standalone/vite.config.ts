import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Absolute root (not a path relative to whatever cwd `vite build` happens to be invoked from) —
// this file is meant to be run via `pnpm --filter @owogg/game-aim-test build`, which sets cwd to
// the package root, one level up from this directory.
const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  // Relative, not "/" (Vite's default) — this bundle is served from
  // official-games/aim-test/<hash>/, never the origin root, and the exact hash segment is only
  // known at publish time. A relative base makes index.html reference `./assets/...`, which
  // resolves correctly under whatever prefix the browser's own base URL happens to be — see
  // games/reaction-time/standalone/vite.config.ts's own doc comment for the full reasoning
  // (identical here).
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
