import fs from "node:fs";
import path from "node:path";
import { buildRegistrySources } from "./registry-builder.js";

async function generateRegistry() {
  const rootDir = process.cwd();

  const { coreRegistryCode, webLoaderCode } = await buildRegistrySources(rootDir);

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

  const webOutputPath = path.join(
    rootDir,
    "apps",
    "web",
    "app",
    "features",
    "catalog",
    "gameLoaders.generated.ts",
  );
  fs.mkdirSync(path.dirname(webOutputPath), { recursive: true });
  fs.writeFileSync(webOutputPath, webLoaderCode.replace(/\r\n/g, "\n"), "utf-8");
  console.log(`✅ Generated Web Loader Registry at ${webOutputPath}`);
}

void generateRegistry();
