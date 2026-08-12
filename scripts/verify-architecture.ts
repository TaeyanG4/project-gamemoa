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
      if (line.includes(`"${forbidden}"`) || line.includes(`'${forbidden}'`) || line.includes(`"${forbidden}/`) || line.includes(`'${forbidden}/`)) {
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
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== "build") {
      scanDir(fullPath, forbiddenImports, ruleName);
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
      checkFile(fullPath, forbiddenImports, ruleName);
    }
  }
}

console.log("🔍 Checking Architecture Layer Boundaries...");

// Rule 1: packages/core MUST NOT import hono, react, @cloudflare/*, @gamemoa/db
scanDir(
  path.join(rootDir, "packages", "core", "src"),
  ["hono", "react", "react-dom", "@cloudflare/workers-types", "@gamemoa/db"],
  "packages/core must remain pure domain/application logic without infrastructure or framework dependencies"
);

// Rule 2: packages/contracts MUST NOT import react, hono, @gamemoa/db
scanDir(
  path.join(rootDir, "packages", "contracts", "src"),
  ["react", "react-dom", "hono", "@gamemoa/db", "@cloudflare/workers-types"],
  "packages/contracts must only contain pure TypeScript types and Zod schemas"
);

// Rule 3: apps/web MUST NOT import @gamemoa/db
scanDir(
  path.join(rootDir, "apps", "web", "app"),
  ["@gamemoa/db"],
  "apps/web must not import database adapters directly"
);

// Rule 4: games/* MUST NOT import @gamemoa/db or hono
scanDir(
  path.join(rootDir, "games"),
  ["@gamemoa/db", "hono"],
  "games/* packages must not depend on database or backend HTTP framework"
);

// Rule 5: apps/api/src/routes MUST NOT directly import concrete D1 repositories
scanDir(
  path.join(rootDir, "apps", "api", "src", "routes"),
  ["D1UserRepository", "D1ScoreRepository", "D1SessionRepository"],
  "apps/api routes must use dependency injection container (Composition Root)"
);

if (violations.length > 0) {
  console.error("\n❌ Architecture Layer Boundary Violations Found:");
  for (const v of violations) {
    console.error(`  - [${v.rule}] ${v.file} imports "${v.imported}"`);
  }
  process.exit(1);
} else {
  console.log("✅ Architecture Layer Boundaries Verified Successfully! 0 Violations Found.\n");
}
