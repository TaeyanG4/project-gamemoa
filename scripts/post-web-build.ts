import fs from "node:fs";
import path from "node:path";

/**
 * [React Router v7 SPA Mode Post-Build Provenance Script]
 *
 * `react-router build` 과정에서 Vite 컴파일러가 `build/client` 디렉토리를 초기화하므로,
 * 빌드 직후 `build/client/version.json` 정적 자산을 확실하게 보장하기 위해 실행됩니다.
 */
const cwd = process.cwd();
const rootDir =
  cwd.endsWith("apps/web") || cwd.endsWith("apps\\web") ? path.resolve(cwd, "..", "..") : cwd;

const clientDir = path.join(rootDir, "apps", "web", "build", "client");
fs.mkdirSync(clientDir, { recursive: true });

const versionPath = path.join(clientDir, "version.json");
const commitSha = process.env.COMMIT_SHA || "dev";
fs.writeFileSync(versionPath, JSON.stringify({ commit: commitSha }, null, 2), "utf-8");
console.log(
  `✅ Deployment Provenance version.json written to ${versionPath} (Commit: ${commitSha})`,
);
