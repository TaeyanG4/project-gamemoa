import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Absolute root (not a path relative to whatever cwd `vite build` happens to be invoked from) —
// this file is meant to be run via `pnpm --filter @owogg/game-typing-test build`, which sets cwd
// to the package root, one level up from this directory.
const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  // Relative, not "/" (Vite's default) — this bundle is served from
  // official-games/typing-test/<hash>/, never the origin root. See
  // games/reaction-time/standalone/vite.config.ts's own doc comment for the full reasoning
  // (identical here).
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
