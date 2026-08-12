import fs from "node:fs";
import path from "node:path";

/**
 * [React Router v7 SPA Mode 빌드 준비 및 Deployment Provenance 버전 정보 생성 스크립트]
 *
 * 이 스크립트가 필요한 이유:
 * 1. React Router v7 SPA Mode(`ssr: false`) 빌드 시, Vite 컴파일러가 빌드 과정에서 `build/server` 디렉토리를
 *    초기화하지만 Wrangler CLI 정적 배포 도구는 `build/server` 구조의 유효성을 체크합니다.
 * 2. 빌드 환경의 COMMIT_SHA 환경변수를 기반으로 `public/version.json` 정적 자산을 자동 생성하여
 *    프로덕션 웹 배포 커밋 검증(Deployment Provenance)을 지원합니다.
 */
const rootDir = process.cwd();

// 1. SPA Mode dummy server build dir
const serverDir = path.join(rootDir, "apps", "web", "build", "server");
fs.mkdirSync(serverDir, { recursive: true });

const dummyServerIndex = path.join(serverDir, "index.js");
if (!fs.existsSync(dummyServerIndex)) {
  fs.writeFileSync(dummyServerIndex, "export default {};\n", "utf-8");
}

// 2. Deployment Provenance version.json static asset
const publicDir = path.join(rootDir, "apps", "web", "public");
fs.mkdirSync(publicDir, { recursive: true });

const versionPath = path.join(publicDir, "version.json");
const commitSha = process.env.COMMIT_SHA || "dev";
fs.writeFileSync(versionPath, JSON.stringify({ commit: commitSha }, null, 2), "utf-8");
