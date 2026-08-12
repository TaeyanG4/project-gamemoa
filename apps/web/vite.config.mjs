import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    fs: {
      strict: false,
    },
  },
  resolve: {
    dedupe: ["react", "react-dom", "react-router"],
  },
  plugins: [
    tailwindcss(),
    reactRouter(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
  ],
});
