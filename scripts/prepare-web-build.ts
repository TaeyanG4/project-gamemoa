import fs from "node:fs";
import path from "node:path";

/**
 * [React Router v7 SPA Mode 빌드 준비 스크립트]
 *
 * 이 스크립트가 필요한 이유:
 * React Router v7 SPA Mode(`ssr: false`) 빌드 시, Vite 컴파일러가 빌드 과정에서 `build/server` 디렉토리를
 * 정리하거나 초기화합니다. 하지만 Cloudflare Workers 정적 자산 배포 빌드 도구(Wrangler CLI)는
 * 빌드 시작 시 `build/server` 구조의 유효성을 수반합니다.
 *
 * 따라서 `react-router build` 실행 직전 `build/server` 디렉토리와 더미 엔트리 포인트를
 * 명시적으로 준비하여 SPA 빌드 과정에서 빌드 디렉토리 미존재 에러를 방지합니다.
 *
 * 제거 조건: React Router v7 / Vite Cloudflare 플러그인 공식 업데이트에서 SPA Mode 전용
 * 빌드 디렉토리 구조 핸들링이 원활해지면 본 스크립트의 빌드 프리훅 의존성을 제거할 수 있습니다.
 */
const serverDir = path.join(process.cwd(), "apps", "web", "build", "server");
fs.mkdirSync(serverDir, { recursive: true });

const dummyServerIndex = path.join(serverDir, "index.js");
if (!fs.existsSync(dummyServerIndex)) {
  fs.writeFileSync(dummyServerIndex, "export default {};\n", "utf-8");
}
