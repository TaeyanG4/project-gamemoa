import fs from "node:fs";
import path from "node:path";

/**
 * [React Router v7 SPA Mode 빌드 준비 스크립트]
 *
 * 이 스크립트가 필요한 이유:
 * 1. React Router v7 SPA Mode(`ssr: false`) 빌드 시, Vite 컴파일러가 빌드 과정에서 `build/server` 디렉토리를
 *    초기화하지만 Wrangler CLI 정적 배포 도구는 `build/server` 구조의 유효성을 체크합니다.
 * 2. 빌드 실행 직전 `build/server` 디렉토리와 더미 엔트리 포인트를 준비하여 디렉토리 미존재 에러를 방지합니다.
 */
const cwd = process.cwd();
const rootDir =
  cwd.endsWith("apps/web") || cwd.endsWith("apps\\web") ? path.resolve(cwd, "..", "..") : cwd;

const serverDir = path.join(rootDir, "apps", "web", "build", "server");
fs.mkdirSync(serverDir, { recursive: true });

const dummyServerIndex = path.join(serverDir, "index.js");
if (!fs.existsSync(dummyServerIndex)) {
  fs.writeFileSync(dummyServerIndex, "export default {};\n", "utf-8");
}
