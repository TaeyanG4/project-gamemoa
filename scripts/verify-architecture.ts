import fs from "node:fs";
import path from "node:path";

interface Violation {
  file: string;
  rule: string;
  imported: string;
}

const rootDir = process.cwd();
const violations: Violation[] = [];

function checkFile(filePath: string, forbiddenImports: string[], ruleName: string) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  const importLines = content.split("\n").filter((line) => line.trim().startsWith("import"));

  for (const line of importLines) {
    for (const forbidden of forbiddenImports) {
      if (
        line.includes(`"${forbidden}"`) ||
        line.includes(`'${forbidden}'`) ||
        line.includes(`"${forbidden}/`) ||
        line.includes(`'${forbidden}/`)
      ) {
        violations.push({
          file: path.relative(rootDir, filePath),
          rule: ruleName,
          imported: forbidden,
        });
      }
    }
  }
}

function scanDir(dirPath: string, forbiddenImports: string[], ruleName: string) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (
      entry.isDirectory() &&
      entry.name !== "node_modules" &&
      entry.name !== "dist" &&
      entry.name !== "build"
    ) {
      scanDir(fullPath, forbiddenImports, ruleName);
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      checkFile(fullPath, forbiddenImports, ruleName);
    }
  }
}

function checkPackageJson(pkgPath: string, forbiddenDeps: string[], ruleName: string) {
  if (!fs.existsSync(pkgPath)) return;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const forbidden of forbiddenDeps) {
    if (allDeps[forbidden]) {
      violations.push({
        file: path.relative(rootDir, pkgPath),
        rule: ruleName,
        imported: forbidden,
      });
    }
  }
}

function checkCorePureness(coreSrcDir: string) {
  if (!fs.existsSync(coreSrcDir)) return;
  const forbiddenTokens = [
    "window.",
    "localStorage.",
    "fetch(",
    "import.meta.env",
    "gamemoa.workers.dev",
  ];

  const scan = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        for (const token of forbiddenTokens) {
          if (content.includes(token)) {
            violations.push({
              file: path.relative(rootDir, fullPath),
              rule: "packages/core must not contain browser APIs, HTTP fetch calls, or environment URLs",
              imported: token,
            });
          }
        }
      }
    }
  };
  scan(coreSrcDir);
}

function checkDbDecoupling(dbSrcDir: string) {
  if (!fs.existsSync(dbSrcDir)) return;
  const forbiddenTokens = ["GAME_MANIFEST_MAP", "GAME_MANIFESTS"];

  const scan = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        for (const token of forbiddenTokens) {
          if (content.includes(token)) {
            violations.push({
              file: path.relative(rootDir, fullPath),
              rule: "packages/db must remain decoupled from game catalog manifests (GAME_MANIFEST_MAP)",
              imported: token,
            });
          }
        }
      }
    }
  };
  scan(dbSrcDir);
}

console.log("🔍 Checking Architecture Layer Boundaries...");

// Rule 1: packages/core MUST NOT import hono, react, @cloudflare/*, @gamemoa/db
scanDir(
  path.join(rootDir, "packages", "core", "src"),
  ["hono", "react", "react-dom", "@cloudflare/workers-types", "@gamemoa/db"],
  "packages/core must remain pure domain/application logic without infrastructure or framework dependencies",
);

// Rule 2: packages/contracts MUST NOT import react, hono, @gamemoa/db
scanDir(
  path.join(rootDir, "packages", "contracts", "src"),
  ["react", "react-dom", "hono", "@gamemoa/db", "@cloudflare/workers-types"],
  "packages/contracts must only contain pure TypeScript types and Zod schemas",
);

// Rule 3: apps/web MUST NOT import @gamemoa/db or @gamemoa/auth
scanDir(
  path.join(rootDir, "apps", "web", "app"),
  ["@gamemoa/db", "@gamemoa/auth"],
  "apps/web must not import database adapters or legacy auth package directly",
);

// Rule 4: games/* MUST NOT import @gamemoa/db or hono
scanDir(
  path.join(rootDir, "games"),
  ["@gamemoa/db", "hono"],
  "games/* packages must not depend on database or backend HTTP framework",
);

// Rule 5: apps/api/src/routes MUST NOT directly import concrete D1 repositories
scanDir(
  path.join(rootDir, "apps", "api", "src", "routes"),
  ["D1UserRepository", "D1ScoreRepository", "D1SessionRepository"],
  "apps/api routes must use dependency injection container (Composition Root)",
);

// Rule 6: apps/web package.json MUST NOT depend on @gamemoa/db or @gamemoa/auth
checkPackageJson(
  path.join(rootDir, "apps", "web", "package.json"),
  ["@gamemoa/db", "@gamemoa/auth"],
  "apps/web package.json must not list database or legacy auth as dependencies",
);

// Rule 7: packages/core MUST be pure (no browser APIs, fetch, or hardcoded worker URLs)
checkCorePureness(path.join(rootDir, "packages", "core", "src"));

// Rule 8: packages/db MUST NOT import GAME_MANIFEST_MAP (decoupled persistence layer)
checkDbDecoupling(path.join(rootDir, "packages", "db", "src"));

if (violations.length > 0) {
  console.error("\n❌ Architecture Layer Boundary Violations Found:");
  for (const v of violations) {
    console.error(`  - [${v.rule}] ${v.file} imports/contains "${v.imported}"`);
  }
  process.exit(1);
} else {
  console.log("✅ Architecture Layer Boundaries Verified Successfully! 0 Violations Found.\n");
}
