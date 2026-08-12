# GAMEMOA 진행 현황 (PROGRESS)

---

## 1. 📊 기능 및 인프라 구현 단계 현황

| 단계        | 기능 및 작업 내용                                                                           | 상태                                            | 검증 방법                                                 |
| :---------- | :------------------------------------------------------------------------------------------ | :---------------------------------------------- | :-------------------------------------------------------- |
| **Phase 0** | 모노레포 구축 (pnpm Workspaces, Turborepo, TypeScript, ESLint, Prettier)                    | ✅ 완료                                         | 품질 게이트 통과                                          |
| **Phase 1** | 웹 플랫폼 쉘 및 UI/UX 구축 (접이식 사이드바, 비주얼 스포트라이트, 카테고리 칩 필터)         | ✅ 완료                                         | React 19 + React Router v7 SPA 빌드 통과                  |
| **Phase 2** | 게이밍 미니게임 컬렉션 (반응속도 테스트, 순서 기억력 테스트, 에임 테스트)                   | ✅ 완료                                         | 단위 테스트 및 반응형 UI 검증 완료                        |
| **Phase 3** | 서버리스 API 백엔드 구축 (Hono + Cloudflare Workers, Cloudflare D1 마이그레이션)            | ✅ 완료                                         | API Health Check 및 integration test 통과                 |
| **Phase 4** | OAuth 및 세션 인증 (Google OAuth GIS, Discord OAuth 2.0, HttpOnly Cookie Session)           | ✅ 완료                                         | 인프라 레이어 분리 및 OAuth 핸들러 검증                   |
| **Phase 5** | 리더보드, 개인 최고기록 및 프로필 연동 (D1 Persistence + ScoreUseCases)                     | ✅ 완료                                         | D1 데이터베이스 쿼리 집계 및 매니페스트 포맷팅            |
| **Phase 6** | 플러그인 아키텍처 및 이중 레지스트리 생성기 결정론적 자동화 (`scripts/registry-builder.ts`) | ✅ 완료                                         | `pnpm registry:check` (Prettier 포맷팅 후 0 diff 검증)    |
| **Phase 7** | Architecture Guard 및 안전 보안 가드 (Layer Boundary Guard, Origin/CSRF guard)              | ✅ 완료                                         | `pnpm architecture:check` 8개 규칙 전원 통과              |
| **Phase 8** | CI/CD 파이프라인 및 프로덕션 배포 파이프라인                                                | 🟡 검증 진행 중 (Local Green / CI Push Pending) | GitHub Actions CI & Cloudflare Deploy 원격 최종 검증 대기 |

---

## 2. ⚙️ 현재 작업 (Current Phase)

- **레지스트리 생성기 결정론적 설계 개선 (P0)**:
  - `scripts/registry-builder.ts`에 Prettier 경로별 설정 및 `filepath` 옵션을 적용하여 생성기 실행과 `pnpm format` 실행 간 서식 불일치를 해소.
  - `scripts/check-registry.ts`를 파일 변형이 없는 순수 메모리 비교 방식(Pure In-Memory Check)으로 개편.
  - 생성기 회귀 단위 테스트(`scripts/generate-game-registry.test.ts`) 구현 완료.
- **Core 구조 중복 정비 (P1)**:
  - `packages/core/src/ports/repositories.ts`로 저장소 포트 인터페이스 단일화.
  - `packages/core`에서 불필요한 `@gamemoa/contracts` 및 `@gamemoa/shared` 의존성을 제거하여 순수 도메인/유즈케이스 레이어로 경량화.
- **문서 본문 한국어 100% 최신화**:
  - `README.md`, `docs/ARCHITECTURE.md`, `docs/PROGRESS.md`, `docs/GAMEMOA_BLUEPRINT.md`, `docs/AGENTS.md`, `docs/WORK_PROGRESS.md`, `docs/ROADMAP.md` 문서 문장을 한국어로 통합 작성.

---

## 3. 🎯 다음 우선순위 (Next Priorities)

1. **원격 GitHub Actions CI 및 Cloudflare Deploy Green 확인**:
   - `git push origin main` 이후 원격 워크플로우 통과 및 프로덕션 웹/API 스모크 검증 완료.
2. **신규 미니게임 확충 (안정화 완료 후 진행)**:
   - `pnpm generate:game <slug>` 스크립트를 활용하여 타자 속도 테스트(typing-test), 색각 이상 테스트(color-test) 등 카탈로그 확장.

---

## 4. 🛠️ 알려진 기술 부채 및 결정 사항 (Technical Debt & Decisions)

1. **D1 세션 토큰 원시 저장 방식**:
   - 현재 D1SessionRepository에 세션 토큰 원시값이 저장을 유지하고 있음. 프로덕션 기존 사용자 로그아웃 영향을 고려하여 향후 마이그레이션 전략 수립 후 SHA-256 토큰 해싱 도입 예정.
2. **React Router v7 SPA Mode Cloudflare 준비 프리훅 스크립트**:
   - `scripts/prepare-web-build.ts` 스크립트를 통해 `build/server` 디렉토리 유효성을 보장 중이며 사유 및 제거 조건이 주석으로 명시되어 있음.

---

## 5. 📜 주요 변경 이력 (History)

- **2026-08-12**: 레지스트리 생성기 Prettier 결정론적 서식 동기화, 순수 메모리 check-registry 개편, Core 레이어 의존성 정비, API response Zod 검증 테스트 확장.
- **2026-08-11**: Aim Test 미니게임 추가, @gamemoa/contracts API Contract 통합, API Composition Root 적용.
- **2026-08-10**: Cloudflare Workers + D1 배포 자동화 CD 구축 및 최초 프로덕션 배포 완료.
