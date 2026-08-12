# GAMEMOA 진행 현황 (PROGRESS)

---

## 1. 📊 기능 및 인프라 구현 단계 현황

| 단계         | 기능 및 작업 내용                                                                                                         | 상태    | 검증 방법                                                                           |
| :----------- | :------------------------------------------------------------------------------------------------------------------------ | :------ | :---------------------------------------------------------------------------------- |
| **Phase 0**  | 모노레포 구축 (pnpm Workspaces, Turborepo, TypeScript, ESLint, Prettier)                                                  | ✅ 완료 | 품질 게이트 통과                                                                    |
| **Phase 1**  | 웹 플랫폼 쉘 및 UI/UX 구축 (접이식 사이드바, 비주얼 스포트라이트, 카테고리 칩 필터)                                       | ✅ 완료 | React 19 + React Router v7 SPA 빌드 통과                                            |
| **Phase 2**  | 게이밍 미니게임 컬렉션 (반응속도 테스트, 순서 기억력 테스트, 에임 테스트, 타자 속도 테스트)                               | ✅ 완료 | 단위 테스트 및 반응형 UI 검증 완료                                                  |
| **Phase 3**  | 서버리스 API 백엔드 구축 (Hono + Cloudflare Workers, Cloudflare D1 마이그레이션)                                          | ✅ 완료 | API Health Check 및 integration test 통과                                           |
| **Phase 4**  | OAuth 및 세션 인증 (Google GIS 및 Discord OAuth 2.0 프로덕션 활성화 완료)                                                 | ✅ 완료 | `pnpm auth:prod:check` GREEN 및 `GET /api/auth/providers` 프로덕션 검증 완료        |
| **Phase 5**  | 인증 강제 리더보드 & 게스트 랭킹 차단 무결성 (D1 0002 마이그레이션 + ScoreUseCases + UX)                                  | ✅ 완료 | `POST /api/scores` 401 테스트, `user_id IS NOT NULL` D1 가드 및 시도 시점 자격 캡처 |
| **Phase 6**  | 플러그인 아키텍처 및 이중 레지스트리 생성기 결정론적 자동화 (`scripts/registry-builder.ts`)                               | ✅ 완료 | `pnpm registry:check` (Prettier 포맷팅 후 0 diff 검증)                              |
| **Phase 7**  | Architecture Guard 및 안전 보안 가드 (Layer Boundary Guard, Origin/CSRF guard)                                            | ✅ 완료 | `pnpm architecture:check` 8개 규칙 전원 통과                                        |
| **Phase 8**  | CI/CD 파이프라인, 프로덕션 배포 파이프라인 및 배포 커밋 출처 검증 (Deployment Provenance)                                 | ✅ 완료 | GitHub Actions CI & Cloudflare Deploy 원격 통과                                     |
| **Phase 9**  | 제품 무결성 & 게임 세션 UX (가짜 랭킹 제거, Web API client, 시도 라이프사이클, 60초 타자)                                 | ✅ 완료 | 랭킹/API/시도 라이프사이클/타자 단위 테스트 전원 통과                               |
| **Phase 10** | 크리티컬 버그 수정 & 게임 플레이 UX (타임아웃 검사기, 소셜진단/Fallback UI, 썸네일 복원, Memory/Typing 버그, 뷰포트 확대) | ✅ 완료 | `pnpm smoke:prod`, `pnpm verify` 및 단위 테스트 전원 통과                           |

---

## 2. ⚙️ 현재 작업 (Current Phase)

- **인증 및 랭킹 무결성 완수 (Authentication & Ranking Integrity Sprint)**:
  - **게스트 랭킹 서버 persistence 차단 (P0)**: `POST /api/scores`에 유효한 `gamemoa_session` 쿠키 검증을 필수화하여 비인증 제출 시 401 Unauthorized 반환. 클라이언트 닉네임 변조를 무효화하고 세션 사용자의 `user_id`, `nickname`, `avatar_url`만 단일 진실의 출처로 바인딩.
  - **도메인/포트/저장소 타입 및 쿼리 강화 (P0)**: `@gamemoa/core` canonical `Score` 엔티티 및 `ScoreRepository` 인터페이스의 `userId`를 `number`로 필수화. `D1ScoreRepository.getLeaderboard` SQL 쿼리에 `WHERE user_id IS NOT NULL` 조건 추가.
  - **D1 0002 마이그레이션 & DB 가드 (P0)**: 신규 순방향 마이그레이션 `0002_score_auth_integrity.sql`을 작성하여 레거시 `user_id IS NULL` 행을 안전하게 정리하고, SQLite `BEFORE INSERT` trigger 가드로 `user_id IS NULL` 생성을 차단.
  - **프론트엔드 시도 라이프사이클 자격 캡처 & 게스트 UI (P1)**: 게임 시도 시작 시점의 인증 상태로 랭킹 참여 자격(`rankingEligible`)을 캡처하여 인증 상태 레이스 조건 방지. 게스트 완료 시 서버 API 호출 없이 로컬 기록만 업데이트하며, "게스트 기록은 이 기기에만 저장됩니다." 한국어 안내 및 로그인 버튼 렌더링.
  - **소셜 로그인 단일 출처 & 배포 파이프라인 (P2)**: `GET /api/auth/providers`에서 공개 `google.clientId`를 반환하도록 일원화하여 컴파일 타임 `VITE_GOOGLE_CLIENT_ID` 의존성 제거. `.github/workflows/deploy.yml` 배포 명령에 프로덕션 변수를 전달하도록 개선하고 `pnpm auth:prod:check` 검증기 구축.

---

## 3. 🎯 다음 우선순위 (Next Priorities)

1. **최근 플레이 기록 (Recent Play History) & 즐겨찾기 (Favorites / Bookmarks)**:
   - 로컬/계정 기반 최근 플레이한 미니게임 및 즐겨찾기 게임 북마크 기능.
2. **홈 화면 맞춤형 추천 (Home Personalization)**:
   - 최근 플레이 및 즐겨찾기 기반 사용자 맞춤형 탭 렌더링.
3. **신규 미니게임 확장**:
   - 색각 이상 테스트(color-test), 숫자 암기 테스트(number-memory) 등 추가.

---

## 4. 🛠️ 알려진 기술 부채 및 결정 사항 (Technical Debt & Decisions)

1. **D1 세션 토큰 원시 저장 방식**:
   - 현재 D1SessionRepository에 세션 토큰 원시값 저장을 유지하고 있음. 프로덕션 기존 사용자 로그아웃 영향을 고려하여 향후 마이그레이션 전략 수립 후 SHA-256 토큰 해싱 도입 예정.
2. **React Router v7 SPA Mode Cloudflare 준비 프리훅 스크립트**:
   - `scripts/prepare-web-build.ts` 스크립트를 통해 `build/server` 디렉토리 유효성을 보장 중이며 사유 및 제거 조건이 주석으로 명시되어 있음.

---

## 5. 📜 주요 변경 이력 (History)

- **2026-08-13**: 크리티컬 버그 수정 및 게임 플레이 UX 안정화 완수 (시간 제한 검증기, 소셜 진단/Fallback UI, 썸네일 자산 복원, Memory/Typing 버그 수정, 뷰포트 확대).
- **2026-08-12**: 가짜 목 데이터 제거, `@gamemoa/contracts` 안전 Web API 클라이언트 도입, 게임 시도 라이프사이클 및 retry 재마운트, 60초 연속 타자속도 테스트 완수.
- **2026-08-12**: 락파일 회귀 수정, 단일 사전 품질 게이트(`pnpm verify`), 배포 커밋 출처 검증(Deployment Provenance) 도입, 타자 속도 테스트(`typing-test`) 미니게임 플러그인 추가.
- **2026-08-11**: Aim Test 미니게임 추가, @gamemoa/contracts API Contract 통합, API Composition Root 적용.
- **2026-08-10**: Cloudflare Workers + D1 배포 자동화 CD 구축 및 최초 프로덕션 배포 완료.
