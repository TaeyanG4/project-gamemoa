import fs from "node:fs";
import path from "node:path";
import { buildRegistrySources } from "./registry-builder.js";

async function generateRegistry() {
  const rootDir = process.cwd();

  const { coreRegistryCode, gameDefinitionsCode } = await buildRegistrySources(rootDir);

  const coreOutputPath = path.join(
    rootDir,
    "packages",
    "core",
    "src",
    "registry",
    "gameRegistry.generated.ts",
  );
  fs.mkdirSync(path.dirname(coreOutputPath), { recursive: true });
  fs.writeFileSync(coreOutputPath, coreRegistryCode.replace(/\r\n/g, "\n"), "utf-8");
  console.log(`✅ Generated Core Game Registry at ${coreOutputPath}`);

  const definitionsOutputPath = path.join(
    rootDir,
    "packages",
    "core",
    "src",
    "registry",
    "gameDefinitions.generated.ts",
  );
  fs.mkdirSync(path.dirname(definitionsOutputPath), { recursive: true });
  fs.writeFileSync(definitionsOutputPath, gameDefinitionsCode.replace(/\r\n/g, "\n"), "utf-8");
  console.log(`✅ Generated Game Definitions at ${definitionsOutputPath}`);
}

void generateRegistry();
