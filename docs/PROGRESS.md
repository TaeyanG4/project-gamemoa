# GAMEMOA 진행 현황 (PROGRESS)

---

## 1. 📊 기능 및 인프라 구현 단계 현황

| 단계         | 기능 및 작업 내용                                                                                                                                          | 상태    | 검증 방법                                                                           |
| :----------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ | :---------------------------------------------------------------------------------- |
| **Phase 0**  | 모노레포 구축 (pnpm Workspaces, Turborepo, TypeScript, ESLint, Prettier)                                                                                   | ✅ 완료 | 품질 게이트 통과                                                                    |
| **Phase 1**  | 웹 플랫폼 쉘 및 UI/UX 구축 (접이식 사이드바, 비주얼 스포트라이트, 카테고리 칩 필터)                                                                        | ✅ 완료 | React 19 + React Router v7 SPA 빌드 통과                                            |
| **Phase 2**  | 게이밍 미니게임 컬렉션 (반응속도 테스트, 순서 기억력 테스트, 에임 테스트, 타자 속도 테스트)                                                                | ✅ 완료 | 단위 테스트 및 반응형 UI 검증 완료                                                  |
| **Phase 3**  | 서버리스 API 백엔드 구축 (Hono + Cloudflare Workers, Cloudflare D1 마이그레이션)                                                                           | ✅ 완료 | API Health Check 및 integration test 통과                                           |
| **Phase 4**  | OAuth 및 세션 인증 (Google GIS 및 Discord OAuth 2.0 프로덕션 활성화 완료)                                                                                  | ✅ 완료 | `pnpm auth:prod:check` GREEN 및 `GET /api/auth/providers` 프로덕션 검증 완료        |
| **Phase 5**  | 인증 강제 리더보드 & 게스트 랭킹 차단 무결성 (D1 0002 마이그레이션 + ScoreUseCases + UX)                                                                   | ✅ 완료 | `POST /api/scores` 401 테스트, `user_id IS NOT NULL` D1 가드 및 시도 시점 자격 캡처 |
| **Phase 6**  | 플러그인 아키텍처 및 이중 레지스트리 생성기 결정론적 자동화 (`scripts/registry-builder.ts`)                                                                | ✅ 완료 | `pnpm registry:check` (Prettier 포맷팅 후 0 diff 검증)                              |
| **Phase 7**  | Architecture Guard 및 안전 보안 가드 (Layer Boundary Guard, Origin/CSRF guard)                                                                             | ✅ 완료 | `pnpm architecture:check` 8개 규칙 전원 통과                                        |
| **Phase 8**  | CI/CD 파이프라인, 프로덕션 배포 파이프라인 및 배포 커밋 출처 검증 (Deployment Provenance)                                                                  | ✅ 완료 | GitHub Actions CI & Cloudflare Deploy 원격 통과                                     |
| **Phase 9**  | 제품 무결성 & 게임 세션 UX (가짜 랭킹 제거, Web API client, 시도 라이프사이클, 60초 타자)                                                                  | ✅ 완료 | 랭킹/API/시도 라이프사이클/타자 단위 테스트 전원 통과                               |
| **Phase 10** | 크리티컬 버그 수정 & 게임 플레이 UX (타임아웃 검사기, 소셜진단/Fallback UI, 썸네일 복원, Memory/Typing 버그, 뷰포트 확대)                                  | ✅ 완료 | `pnpm smoke:prod`, `pnpm verify` 및 단위 테스트 전원 통과                           |
| **Phase 11** | 계정 식별/통합 & 즐겨찾기 접근통제 & OAuth 보안 & 브랜드 파비콘 (별도 계정 기본, Primary Account Wins 통합, 게스트 즐겨찾기 제거, Google JWT/JWKS, 파비콘) | ✅ 완료 | `pnpm verify`, 단위 테스트, D1 마이그레이션 0003/0004 및 파비콘 자산 검증 통과      |
| **Phase 12** | GAMEMOA 플레이어 플랫폼 확장 스프린트 — **Phase B: 진행도(XP/레벨/도전과제) 파운데이션** (My Page/Creator/Discord의 하위 기반)                             | ✅ 완료 | `pnpm verify`, D1 마이그레이션 0005 로컬 적용 검증, 신규 단위/통합 테스트 전원 통과 |

---

## 2. ⚙️ 현재 작업 (Current Phase)

- **GAMEMOA 플레이어 플랫폼 확장 스프린트 — Phase B: 진행도 파운데이션 (Phase 12)**:
  - **XP/레벨 시스템**: 서버 권위 XP(인증 완료 1회당 +10), 사용자×게임×UTC일 기준 최대 10회 XP 지급 상한, `xp_events` 원장 + `UNIQUE(source_type, source_id)` 멱등성, `user_progress` 집계. 순수 함수 레벨 공식(`100 × (L-1)²`) 및 파생 진행도 필드.
  - **도전과제**: `user_achievements`(`UNIQUE(user_id, achievement_code)`), 7종 초기 도전과제(FIRST_PLAY/PLAY_10/PLAY_100/FIRST_FAVORITE/LEVEL_5/LEVEL_10/ALL_GAMES), 게임 완료·즐겨찾기 추가 시점 자동 평가.
  - **닉네임/국가·지역 정책 중앙화**: `profilePolicy.ts` — 닉네임 Unicode 2~20자 + 7일 쿨다운, 국가/지역 ISO 3166-1 alpha-2 + 30일 쿨다운("국적 인증" 아님, IP 미추론).
  - **신규 API**: `GET /api/progression/me`, `GET /api/progression/leaderboard`(글로벌 XP 랭킹, 공개), `GET /api/progression/achievements`, `POST /api/profile/nickname`, `POST /api/profile/country`. `POST /api/scores` 응답에 XP/도전과제 부수효과 포함(점수 자체는 불변).
  - **계정 통합 정합성 확장**: Primary Account Wins 병합 시 Secondary의 `xp_events`/`user_progress`/`user_achievements`도 원자적으로 삭제(고스트 진행도 방지), 기존 초대 흐름 무변경.
  - **범위 밖(후속 세션)**: My Page/Account Center UI, Creator, Discord 연동 — `docs/PROGRESSION.md` §11 참고.
- **계정 식별/통합 & 즐겨찾기 접근통제 & OAuth 보안 & 브랜드 파비콘 스프린트 (Phase 11)**:
  - **계정 모델 (별도 계정 기본)**: Google/Discord 로그인을 기본적으로 별도 GAMEMOA 계정으로 분리하고, 동일 이메일을 자동 병합 근거로 사용하지 않음. 정규 식별자는 `provider` + `provider_user_id`(Google `sub`, Discord 사용자 ID).
  - **즐겨찾기 접근 통제 (P0)**: 게스트 즐겨찾기를 로그인 전용으로 변경 — 게스트 즐겨찾기 클릭/카테고리 칩 선택은 로그인 모달을 호출하고 로컬 즐겨찾기 미저장. 로컬스토리지 v1→v2 마이그레이션으로 기존 게스트 즐겨찾기를 폐기하고 최근 플레이만 보존. 게스트 임포트 계약/API/유즈케이스/저장소 흐름에서 `guestFavorites` 제거.
  - **OAuth 공급자 연결 (P1)**: `UserRepository` 연결 역량(getOAuthAccounts/findOAuthAccount/linkOAuthAccount/unlinkOAuthAccount), `IdentityUseCases`, 마이그레이션 `0003_account_identity.sql`(`UNIQUE(user_id, provider)`), 연결/연결해제 API 및 `ACCOUNT_ALREADY_LINKED`/`PROVIDER_ALREADY_LINKED`/`LAST_AUTH_PROVIDER` 코드. LOGIN과 LINK 흐름 명시 분리 — Discord LINK `state`는 인증 세션에 바인딩 후 콜백 재검증.
  - **Primary Account Wins 계정 통합 (P1)**: 단기/일회용 `account_merge_challenges`(마이그레이션 `0004`), `AccountMergeUseCases`(소유 증명 + 챌린지 검증 + 동일 프로바이더 충돌 가드), D1 `batch` 원자 트랜잭션(Secondary 점수/즐겨찾기/최근플레이/세션 삭제 → Secondary OAuth 이전 → Secondary 사용자 삭제). Primary 데이터 유지, Secondary 데이터 폐기, 로그인 수단만 이전. 기록 합집합 미수행.
  - **Google 보안 강화 (P2)**: `tokeninfo` 엔드포인트 대신 Google OpenID JWKS로 로컬 JWT 서명(RS256) 검증. `iss`/`aud`/`exp`/`sub` 검증 및 JWKS 캐싱. `sub` 캐노니컬 식별자, 검증 이메일은 메타데이터.
  - **프로필 계정 관리 UX (P4)**: 프로필 "연결된 로그인 계정" 섹션(연결됨/연결/연결해제), `MergeModal`(안전 요약/Primary 선택/삭제 경고/원자 확정), 연결 충돌 시 계정 통합 제안.
  - **브랜드 파비콘 (P3)**: 캐노니컬 `favicon.svg`(게임 허브 4-타일 마크), 결정론적 `scripts/generate-favicon.ts`(의존성 없는 PNG/ICO 인코더)로 favicon.ico/PNG/애플터치아이콘/`site.webmanifest` 생성, SPA 셸에 파비콘 링크 주입 및 프로덕션 자산 200 검증.

---

## 3. 🎯 다음 우선순위 (Next Priorities)

플레이어 플랫폼 확장 스프린트는 여러 세션에 걸쳐 단계적으로 진행됩니다 (`docs/WORK_PROGRESS.md`의 Next Action 참고):

1. **Phase C: My Page / Account Center / Public Profile UI** — 이번 세션에서 구축한 진행도 API를 소비하는 `/me`, `/account`, `/profile/:id` 대시보드.
2. **Phase D~E: Creator 모델** — 채널 소유권 인증(YouTube/CHZZK/SOOP/Twitch), Featured Creator 심사 엔진, Creator 랭킹.
3. **Phase F~H: Discord 연동** — HTTP Interactions 서명 검증, `/gamemoa link|profile|rank|leaderboard|play|server|games`, 서버 등록/검색, 길드-로컬 XP.
4. **신규 미니게임 확장**: 색각 이상 테스트(color-test), 숫자 암기 테스트(number-memory), CPS 테스트(cps-test).

---

## 4. 🛠️ 알려진 기술 부채 및 결정 사항 (Technical Debt & Decisions)

1. **D1 세션 토큰 원시 저장 방식**:
   - 현재 D1SessionRepository에 세션 토큰 원시값 저장을 유지하고 있음. 프로덕션 기존 사용자 로그아웃 영향을 고려하여 향후 마이그레이션 전략 수립 후 SHA-256 토큰 해싱 도입 예정.
2. **React Router v7 SPA Mode Cloudflare 준비 프리훅 스크립트**:
   - `scripts/prepare-web-build.ts` 스크립트를 통해 `build/server` 디렉토리 유효성을 보장 중이며 사유 및 제거 조건이 주석으로 명시되어 있음.

---

## 5. 📜 주요 변경 이력 (History)

- **2026-08-13**: GAMEMOA 플레이어 플랫폼 확장 스프린트 Phase B(진행도 파운데이션) 완수 — 서버 권위 XP 원장/일일 상한/멱등성, 결정론적 레벨 공식, 7종 초기 도전과제, 닉네임/국가·지역 정책 중앙화(쿨다운), `/api/progression/*` 및 `/api/profile/*` 신규 API, 계정 통합 시 Secondary 진행도 삭제 정합성 확장.
- **2026-08-13**: 계정 식별/통합 & 즐겨찾기 접근통제 & OAuth 보안 & 브랜드 파비콘 스프린트 완수 — Google/Discord 별도 계정 기본, 게스트 즐겨찾기 로그인 전용화 및 v1→v2 마이그레이션, OAuth 공급자 연결/연결해제, Primary Account Wins 원자 통합, Google JWT/JWKS 검증, 프로필 계정 관리 UX, GAMEMOA 파비콘 자산.
- **2026-08-13**: 크리티컬 버그 수정 및 게임 플레이 UX 안정화 완수 (시간 제한 검증기, 소셜 진단/Fallback UI, 썸네일 자산 복원, Memory/Typing 버그 수정, 뷰포트 확대).
- **2026-08-12**: 가짜 목 데이터 제거, `@gamemoa/contracts` 안전 Web API 클라이언트 도입, 게임 시도 라이프사이클 및 retry 재마운트, 60초 연속 타자속도 테스트 완수.
- **2026-08-12**: 락파일 회귀 수정, 단일 사전 품질 게이트(`pnpm verify`), 배포 커밋 출처 검증(Deployment Provenance) 도입, 타자 속도 테스트(`typing-test`) 미니게임 플러그인 추가.
- **2026-08-11**: Aim Test 미니게임 추가, @gamemoa/contracts API Contract 통합, API Composition Root 적용.
- **2026-08-10**: Cloudflare Workers + D1 배포 자동화 CD 구축 및 최초 프로덕션 배포 완료.
