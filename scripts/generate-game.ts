import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const rawSlug = args[0];

if (!rawSlug) {
  console.error("Usage: pnpm generate:game <game-slug>");
  process.exit(1);
}

const slug = rawSlug
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9-]/g, "");
const rootDir = process.cwd();
const gameDir = path.join(rootDir, "games", slug);

if (fs.existsSync(gameDir)) {
  console.error(`Error: Game directory games/${slug} already exists.`);
  process.exit(1);
}

console.log(`🎮 Generating new game package in games/${slug}...`);

fs.mkdirSync(path.join(gameDir, "src"), { recursive: true });
fs.mkdirSync(path.join(gameDir, "test"), { recursive: true });

// 1. package.json
const pkgJson = {
  name: `@owogg/game-${slug}`,
  version: "0.0.1",
  type: "module",
  exports: {
    ".": {
      types: "./src/index.ts",
      default: "./src/index.ts",
    },
  },
  dependencies: {
    "@owogg/game-sdk": "workspace:*",
    "@owogg/shared": "workspace:*",
    react: "^19.1.0",
  },
  devDependencies: {
    "@types/node": "^22.10.0",
    "@types/react": "^19.1.0",
    tsx: "^4.23.12",
    typescript: "^5.8.0",
  },
  scripts: {
    typecheck: "tsc --noEmit",
    lint: "eslint src/",
    test: "tsx --test test/**/*.test.ts",
    build: "echo 'build not needed - source-only package' && exit 0",
  },
};
fs.writeFileSync(path.join(gameDir, "package.json"), JSON.stringify(pkgJson, null, 2));

// 1b. Register dependency in apps/web/package.json
const webPkgPath = path.join(rootDir, "apps", "web", "package.json");
if (fs.existsSync(webPkgPath)) {
  const webPkg = JSON.parse(fs.readFileSync(webPkgPath, "utf-8"));
  webPkg.dependencies = webPkg.dependencies || {};
  webPkg.dependencies[`@owogg/game-${slug}`] = "workspace:*";
  // Sort dependencies alphabetically
  webPkg.dependencies = Object.fromEntries(
    Object.entries(webPkg.dependencies).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.writeFileSync(webPkgPath, JSON.stringify(webPkg, null, 2) + "\n", "utf-8");
}

// 2. tsconfig.json
const tsconfig = {
  extends: "../../tsconfig.base.json",
  compilerOptions: {
    outDir: "./dist",
    rootDir: "./src",
  },
  include: ["src"],
};
fs.writeFileSync(path.join(gameDir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));

// 3. src/manifest.ts
const titleName = slug
  .split("-")
  .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
  .join(" ");
const manifestCode = `import type { GameManifest } from "@owogg/game-sdk";

export const manifest: GameManifest = {
  id: "${slug}",
  slug: "${slug}",
  title: "${titleName}",
  shortDescription: "${titleName} 미니게임에 도전하세요!",
  description: "${titleName} 게임입니다. 최고 기록에 도전해보세요.",
  modes: ["single"] as const,
  status: "published",
  categories: ["action", "popular"],
  tags: ["${slug}", "게임"],
  minPlayers: 1,
  maxPlayers: 1,
  thumbnail: "/games/${slug}/thumbnail.svg",
  accent: "#6366f1",
  estimatedRoundSeconds: 30,
  requiresAuth: false,
  supportsLeaderboard: true,
  version: "0.0.1",
  scoreConfig: {
    unit: "ms",
    direction: "asc",
    min: 50,
    max: 60000,
  },
};
`;
fs.writeFileSync(path.join(gameDir, "src", "manifest.ts"), manifestCode);

// 4. src/game.tsx
const gameCode = `import React, { useState } from "react";

export interface ${titleName.replace(/\s+/g, "")}Props {
  onFinish?: (score: number) => void;
}

export function ${titleName.replace(/\s+/g, "")}Game({ onFinish }: ${titleName.replace(/\s+/g, "")}Props) {
  const [score, setScore] = useState<number | null>(null);

  const handleComplete = () => {
    const finalScore = Math.floor(Math.random() * 300) + 150;
    setScore(finalScore);
    onFinish?.(finalScore);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-900 text-white rounded-xl">
      <h2 className="text-2xl font-bold mb-4">${titleName}</h2>
      {score === null ? (
        <button
          onClick={handleComplete}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold cursor-pointer"
        >
          게임 시작 / 클릭
        </button>
      ) : (
        <div className="text-center">
          <p className="text-xl mb-4">최종 점수: <span className="font-bold text-indigo-400">{score} ms</span></p>
          <button
            onClick={() => setScore(null)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
          >
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
}
`;
fs.writeFileSync(path.join(gameDir, "src", "game.tsx"), gameCode);

// 5. src/index.ts
const indexCode = `export * from "./manifest.js";
export * from "./game.js";
`;
fs.writeFileSync(path.join(gameDir, "src", "index.ts"), indexCode);

// 6. test/game.test.ts
const testCode = `import test from "node:test";
import assert from "node:assert/strict";
import { manifest } from "../src/manifest.js";

test("${slug} manifest has valid scoreConfig", () => {
  assert.equal(manifest.id, "${slug}");
  assert.ok(manifest.scoreConfig);
  assert.equal(manifest.scoreConfig.unit, "ms");
});
`;
fs.writeFileSync(path.join(gameDir, "test", "game.test.ts"), testCode);

console.log(`✅ Generated games/${slug} successfully!`);
console.log(`🔄 Updating Game Registry...`);
execSync("npx tsx scripts/generate-game-registry.ts", { stdio: "inherit" });
console.log(`🎉 Done! Game "${slug}" registered in platform.`);
