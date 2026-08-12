# GAMEMOA 진행 현황 (PROGRESS)

---

## 1. 📊 기능 및 인프라 구현 단계 현황

| 단계        | 기능 및 작업 내용                                                                           | 상태    | 검증 방법                                              |
| :---------- | :------------------------------------------------------------------------------------------ | :------ | :----------------------------------------------------- |
| **Phase 0** | 모노레포 구축 (pnpm Workspaces, Turborepo, TypeScript, ESLint, Prettier)                    | ✅ 완료 | 품질 게이트 통과                                       |
| **Phase 1** | 웹 플랫폼 쉘 및 UI/UX 구축 (접이식 사이드바, 비주얼 스포트라이트, 카테고리 칩 필터)         | ✅ 완료 | React 19 + React Router v7 SPA 빌드 통과               |
| **Phase 2** | 게이밍 미니게임 컬렉션 (반응속도 테스트, 순서 기억력 테스트, 에임 테스트, 타자 속도 테스트) | ✅ 완료 | 단위 테스트 및 반응형 UI 검증 완료                     |
| **Phase 3** | 서버리스 API 백엔드 구축 (Hono + Cloudflare Workers, Cloudflare D1 마이그레이션)            | ✅ 완료 | API Health Check 및 integration test 통과              |
| **Phase 4** | OAuth 및 세션 인증 (Google OAuth GIS, Discord OAuth 2.0, HttpOnly Cookie Session)           | ✅ 완료 | 인프라 레이어 분리 및 OAuth 핸들러 검증                |
| **Phase 5** | 리더보드, 개인 최고기록 및 프로필 연동 (D1 Persistence + ScoreUseCases)                     | ✅ 완료 | D1 데이터베이스 쿼리 집계 및 매니페스트 포맷팅         |
| **Phase 6** | 플러그인 아키텍처 및 이중 레지스트리 생성기 결정론적 자동화 (`scripts/registry-builder.ts`) | ✅ 완료 | `pnpm registry:check` (Prettier 포맷팅 후 0 diff 검증) |
| **Phase 7** | Architecture Guard 및 안전 보안 가드 (Layer Boundary Guard, Origin/CSRF guard)              | ✅ 완료 | `pnpm architecture:check` 8개 규칙 전원 통과           |
| **Phase 8** | CI/CD 파이프라인, 프로덕션 배포 파이프라인 및 배포 커밋 출처 검증 (Deployment Provenance)   | ✅ 완료 | GitHub Actions CI & Cloudflare Deploy 원격 통과        |

---

## 2. ⚙️ 현재 작업 (Current Phase)

- **배포 커밋 출처 검증 시스템 구축 (Deployment Provenance) (P0)**:
  - API `/api/health` 및 Web `/version.json`에 빌드 커밋 SHA 포함.
  - `.github/workflows/deploy.yml` 배포 직후 원격 배포 버전의 SHA와 GitHub `head_sha`가 100% 일치하는지 자동 검증하여 구버전 배포 방지.
- **사전 통합 품질 게이트 구축 (`pnpm verify`) (P0)**:
  - Root `package.json`에 `frozen-lockfile` 동기화, `format:check`, `architecture:check`, `registry:check`, `lint`, `typecheck`, `test`, `build` 단일 스크립트 결합.
- **신규 타자 속도 테스트 (`typing-test`) 플러그인 추가 (P1)**:
  - WPM(분당 단어 수), CPM(분당 타수), 정확도 실시간 측정 엔진 및 단위 테스트 구현.
  - 이중 레지스트리 빌드타임 자동 갱신을 통해 중앙 컨트롤러 수정 없이 4번째 미니게임 탑재 완수.

---

## 3. 🎯 다음 우선순위 (Next Priorities)

1. **원격 배포 최종 스모크 및 리더보드 통합 검증**:
   - `typing-test` WPM 점수 제출 및 글로벌 리더보드 연동 확인.
2. **추가 미니게임 확장**:
   - 색각 이상 테스트(color-test), 숫자 암기 테스트(number-memory) 등 DX CLI 기반 순차 추가.

---

## 4. 🛠️ 알려진 기술 부채 및 결정 사항 (Technical Debt & Decisions)

1. **D1 세션 토큰 원시 저장 방식**:
   - 현재 D1SessionRepository에 세션 토큰 원시값이 저장을 유지하고 있음. 프로덕션 기존 사용자 로그아웃 영향을 고려하여 향후 마이그레이션 전략 수립 후 SHA-256 토큰 해싱 도입 예정.
2. **React Router v7 SPA Mode Cloudflare 준비 프리훅 스크립트**:
   - `scripts/prepare-web-build.ts` 스크립트를 통해 `build/server` 디렉토리 유효성을 보장 중이며 사유 및 제거 조건이 주석으로 명시되어 있음.

---

## 5. 📜 주요 변경 이력 (History)

- **2026-08-12**: 락파일 회귀 수정, 단일 사전 품질 게이트(`pnpm verify`), 배포 커밋 출처 검증(Deployment Provenance) 도입, 타자 속도 테스트(`typing-test`) 미니게임 플러그인 추가.
- **2026-08-11**: Aim Test 미니게임 추가, @gamemoa/contracts API Contract 통합, API Composition Root 적용.
- **2026-08-10**: Cloudflare Workers + D1 배포 자동화 CD 구축 및 최초 프로덕션 배포 완료.
