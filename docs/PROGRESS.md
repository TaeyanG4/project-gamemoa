# OwOGG 진행 현황 (PROGRESS)

---

## 1. 📊 기능 및 인프라 구현 단계 현황

| 단계         | 기능 및 작업 내용                                                                                                                                                                            | 상태    | 검증 방법                                                                                                      |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ | :------------------------------------------------------------------------------------------------------------- |
| **Phase 0**  | 모노레포 구축 (pnpm Workspaces, Turborepo, TypeScript, ESLint, Prettier)                                                                                                                     | ✅ 완료 | 품질 게이트 통과                                                                                               |
| **Phase 1**  | 웹 플랫폼 쉘 및 UI/UX 구축 (접이식 사이드바, 비주얼 스포트라이트, 카테고리 칩 필터)                                                                                                          | ✅ 완료 | React 19 + React Router v7 SPA 빌드 통과                                                                       |
| **Phase 2**  | 게이밍 미니게임 컬렉션 (반응속도 테스트, 순서 기억력 테스트, 에임 테스트, 타자 속도 테스트)                                                                                                  | ✅ 완료 | 단위 테스트 및 반응형 UI 검증 완료                                                                             |
| **Phase 3**  | 서버리스 API 백엔드 구축 (Hono + Cloudflare Workers, Cloudflare D1 마이그레이션)                                                                                                             | ✅ 완료 | API Health Check 및 integration test 통과                                                                      |
| **Phase 4**  | OAuth 및 세션 인증 (Google GIS 및 Discord OAuth 2.0 프로덕션 활성화 완료)                                                                                                                    | ✅ 완료 | `pnpm auth:prod:check` GREEN 및 `GET /api/auth/providers` 프로덕션 검증 완료                                   |
| **Phase 5**  | 인증 강제 리더보드 & 게스트 랭킹 차단 무결성 (D1 0002 마이그레이션 + ScoreUseCases + UX)                                                                                                     | ✅ 완료 | `POST /api/scores` 401 테스트, `user_id IS NOT NULL` D1 가드 및 시도 시점 자격 캡처                            |
| **Phase 6**  | 플러그인 아키텍처 및 이중 레지스트리 생성기 결정론적 자동화 (`scripts/registry-builder.ts`)                                                                                                  | ✅ 완료 | `pnpm registry:check` (Prettier 포맷팅 후 0 diff 검증)                                                         |
| **Phase 7**  | Architecture Guard 및 안전 보안 가드 (Layer Boundary Guard, Origin/CSRF guard)                                                                                                               | ✅ 완료 | `pnpm architecture:check` 8개 규칙 전원 통과                                                                   |
| **Phase 8**  | CI/CD 파이프라인, 프로덕션 배포 파이프라인 및 배포 커밋 출처 검증 (Deployment Provenance)                                                                                                    | ✅ 완료 | GitHub Actions CI & Cloudflare Deploy 원격 통과                                                                |
| **Phase 9**  | 제품 무결성 & 게임 세션 UX (가짜 랭킹 제거, Web API client, 시도 라이프사이클, 60초 타자)                                                                                                    | ✅ 완료 | 랭킹/API/시도 라이프사이클/타자 단위 테스트 전원 통과                                                          |
| **Phase 10** | 크리티컬 버그 수정 & 게임 플레이 UX (타임아웃 검사기, 소셜진단/Fallback UI, 썸네일 복원, Memory/Typing 버그, 뷰포트 확대)                                                                    | ✅ 완료 | `pnpm smoke:prod`, `pnpm verify` 및 단위 테스트 전원 통과                                                      |
| **Phase 11** | 계정 식별/통합 & 즐겨찾기 접근통제 & OAuth 보안 & 브랜드 파비콘 (별도 계정 기본, Primary Account Wins 통합, 게스트 즐겨찾기 제거, Google JWT/JWKS, 파비콘)                                   | ✅ 완료 | `pnpm verify`, 단위 테스트, D1 마이그레이션 0003/0004 및 파비콘 자산 검증 통과                                 |
| **Phase 12** | OwOGG 플레이어 플랫폼 확장 스프린트 — **Phase B: 진행도(XP/레벨/도전과제) 파운데이션** (My Page/Creator/Discord의 하위 기반)                                                                 | ✅ 완료 | `pnpm verify`, D1 마이그레이션 0005 로컬 적용 검증, 신규 단위/통합 테스트 전원 통과                            |
| **Phase 13** | OwOGG 플레이어 플랫폼 확장 스프린트 — **Phase C 완료(My Page 탭 분리, 닉네임/국가 UI, 즐겨찾기/최근 플레이) + Discord `잘못된 redirect_uri` 버그 수정 + Phase F(Discord HTTP Interactions)** | ✅ 완료 | `pnpm verify`, D1 마이그레이션 0006 로컬 적용 검증, Ed25519 실서명 테스트 포함 신규 단위/통합 테스트 전원 통과 |
| **Phase 14** | OwOGG 플레이어 플랫폼 확장 스프린트 — **Phase G: Discord 서버 시스템 (서버 등록 / 디렉토리·검색 / 공개 서버 페이지 / 서버 관리)**                                                            | ✅ 완료 | `pnpm verify`, D1 마이그레이션 0007 로컬 적용 검증, 단위/통합 테스트 전원 통과                                 |
| **Phase 15** | OwOGG 플레이어 플랫폼 확장 스프린트 — **Phase H1: Discord 길드 XP 귀속 파운데이션 & `/owogg play`**                                                                                          | ✅ 완료 | `pnpm verify`, D1 마이그레이션 0008 로컬 적용 검증, 100/100 단위 테스트 전원 통과                              |
| **Phase 16** | OwOGG 플레이어 플랫폼 확장 스프린트 — **Phase E2A: Featured Creator 자격 심사 엔진 및 6시간 자동 재심사**                                                                                    | ✅ 완료 | `pnpm verify`, D1 마이그레이션 0012, 공식 지표 재조회·재시도·스케줄러 테스트 통과                              |
| **Phase 17** | OwOGG 플레이어 플랫폼 확장 스프린트 — **Phase E2B: 수동 심사·감사 원장·14일 Featured 재검증·관리자 안전**                                                                                    | ✅ 완료 | `pnpm verify`, D1 마이그레이션 0013, 관리자/재검증/감사/기존 회귀 테스트 통과                                  |
| **Phase 18** | OwOGG 플레이어 플랫폼 확장 스프린트 — **Phase I 구현: 계정 통합 무결성·Admin Center·Discord Bot/Web 가이드·쿼리 보안**                                                                       | ✅ 완료 | `pnpm verify`, GitHub CI, Cloudflare Deploy, provenance 및 `pnpm smoke:prod` 통과                              |

---

## 2. ⚙️ 현재 작업 (Current Phase)

- **OwOGG 플레이어 플랫폼 확장 스프린트 — Phase I 완료**:
  - `ADMIN_USER_IDS` 명시적 사용자 ID 기반 서버 관리자 권한(기본 거부), 보호된 Creator 수동 심사 큐/API/UI, 승인·거절·검토 유지 액션과 필수 사유.
  - `creator_review_audit_log` append-only 감사 원장 및 UPDATE/DELETE 차단 트리거.
  - 취득 심사(6시간)와 Featured 재검증(14일)을 잡 유형으로 분리하고, audience 8,000 유지 기준·일시 오류 보존·공식 삭제 확정 철회 정책 적용.
  - 수동 심사 내부 사유는 Creator API/UI에 노출하지 않으며 Featured는 score/XP/ranking에 영향을 주지 않음.
  - Primary Account Wins에서 Secondary XP와 파생 Guild XP를 삭제하고, Discord/Creator identity-like 관계를 안전하게 이전하며 Creator 플랫폼 충돌은 차단.
  - `/admin` Admin Center, 관리자 `Origin`/`no-store` 가드, `/discord/guide`, 한국어 운영 문서와 공개 쿼리 검증을 추가.

- **OwOGG 플레이어 플랫폼 확장 스프린트 — Phase H1: Discord 길드 XP 귀속 파운데이션 (Phase 15)**:
  - **3개 XP 개념 엄격 분리**: Global OwOGG XP, Discord Guild-local User XP, Discord Guild Activity XP. (유저의 기존 글로벌 XP 25,000 보유 시에도 길드 가입 시 Guild XP = 0에서 시작).
  - **서버 권위 귀속 & 1회용 Play Context**: `/owogg play [game]` 슬래시 커맨드로 매니페스트 기반 기여 플레이 링크 및 1회용 Play Context 토큰(`discord_play_contexts`, 15분 만료) 생성. DB에는 SHA-256 해시만 보관.
  - **Referer 누출 차단 보안**: 웹 SPA 로드 시 URL Fragment(`#play_token=...`)에서 메모리로 즉시 추출 후 `history.replaceState`로 URL 제거.
  - **1:1 원자적 귀속 제약조건**: 마이그레이션 `0008_discord_guild_xp.sql` — `discord_guild_xp_events` 테이블 `UNIQUE(source_xp_event_id)` 제약조건으로 단 1개의 글로벌 `xp_events` 행에 대해 최대 1개의 길드 XP 귀속만 발생하도록 강제.
  - **원자적 계산 & 일일 상한 연동**: 점수 완료 시 실제 지급된 글로벌 XP(+10 또는 상한 달성 시 0)와 100% 동기화되어 귀속. 게임 점수 불변 유지.

- **OwOGG 플레이어 플랫폼 확장 스프린트 — Phase G: Discord 서버 시스템 (Phase 14)**:
  - **개념 분리**: 일반 OwOGG 게임 랭킹(`/ranking`)과 Discord 서버 커뮤니티 페이지(`/discord/*`)를 완전히 분리.
  - **서버 등록 권한 검증**: Discord OAuth `guilds` 스코프 1회용 인증으로 `MANAGE_GUILD`/`ADMINISTRATOR` 권한이 있는 관리자만 서버 등록 가능. 1회용 해시 챌린지(`discord_server_registration_challenges`, 마이그레이션 0007) 발급 후 Discord access_token 즉시 삭제.
  - **Vanity Slug 정책**: 영문 소문자/숫자/하이픈 3~32자, 예약어(`admin`, `api`, `register` 등) 차단, Slug 변경 시에도 `guild_id` 정규 식별자는 영구 보존.
  - **공개 디렉토리 & 검색 (`/discord/servers`)**: PUBLIC 상태 등록 서버의 인덱스 검색, 바운디드 쿼리, candidate 등록 모달 위저드.
  - **공개 서버 페이지 (`/discord/servers/:slug`)**: 서버 메타데이터, 가시성 배지, Phase H 정갈한 자리표시자 안내 문구.
  - **서버 관리 페이지 (`/discord/servers/:slug/manage`)**: 검증된 관리자 전용 수정 (설명/slug/가시성 PUBLIC·UNLISTED·PRIVATE/등록 해제).

- **OwOGG 플레이어 플랫폼 확장 스프린트 — Phase C 완료 + Discord 버그 수정 + Phase F: Discord HTTP Interactions (Phase 13)**:
  - **My Page "내 프로필"/"기록" 탭 분리**: `/profile`을 탭(세그먼트 컨트롤)으로 분리 — 내 프로필(사용자 카드, 레벨/XP, 프로필 설정, 즐겨찾기, 최근 플레이, 연결된 로그인 계정) / 기록(도전과제, 게임별 최고 기록). 게임 기록 카드를 실제 썸네일 + accent 색상 기반으로 재구성.
  - **닉네임/국가 변경 UI**: `POST /api/profile/nickname`/`POST /api/profile/country` 연결, 쿨다운 에러 시 다음 가능 날짜 안내, 큐레이션 34개국 셀렉트("국적 인증" 아님을 명시).
  - **버그 수정: `/api/auth/me` 세션 조회 필드 누락**: `D1SessionRepository`가 마이그레이션 0005 컬럼(country/nickname_updated_at/country_updated_at)을 조회하지 않고 있던 문제 수정, `AuthUserSchema` 필드 추가.
  - **버그 수정: Discord 계정 연결 `잘못된 OAuth2 redirect_uri`**: LOGIN과 LINK 흐름이 서로 다른 redirect_uri를 Discord에 전송하던 문제 — 단일 등록된 redirect_uri로 통합(`getDiscordRedirectUri`), LOGIN/LINK 구분은 state 쿠키로 판별. Developer Portal 설정 변경 불필요.
  - **UI 정리**: 푸터 "인기 태그"/설명 문단 제거, 로고 옆 한 줄 태그라인으로 축소.
  - **Phase F: Discord HTTP Interactions**: `POST /api/discord/interactions` — Ed25519 서명 검증(Cloudflare Workers `crypto.subtle` 네이티브, 추가 의존성 없음), PING/PONG, `/owogg link|profile|games` 명령어. `/owogg link`는 1회용 해시 토큰(`discord_link_challenges`, 마이그레이션 0006) 발급 → 웹 `/discord/link` 페이지에서 로그인 후 확인 → 기존 `IdentityUseCases.linkProvider` 재사용(별도 병합 로직 없음). 명령어 등록 스크립트(`pnpm discord:commands:register`) 및 상세 아키텍처/설정 가이드는 `docs/DISCORD_INTEGRATION.md` 참고. **외부 설정 대기**: `DISCORD_PUBLIC_KEY` GitHub Variable, Developer Portal Interactions Endpoint URL, 명령어 등록 — 전부 사용자의 Discord Developer Portal 접근 필요.
- **OwOGG 플레이어 플랫폼 확장 스프린트 — Phase B: 진행도 파운데이션 (Phase 12)**:
  - **XP/레벨 시스템**: 서버 권위 XP(인증 완료 1회당 +10), 사용자×게임×UTC일 기준 최대 10회 XP 지급 상한, `xp_events` 원장 + `UNIQUE(source_type, source_id)` 멱등성, `user_progress` 집계. 순수 함수 레벨 공식(`100 × (L-1)²`) 및 파생 진행도 필드.
  - **도전과제**: `user_achievements`(`UNIQUE(user_id, achievement_code)`), 7종 초기 도전과제(FIRST_PLAY/PLAY_10/PLAY_100/FIRST_FAVORITE/LEVEL_5/LEVEL_10/ALL_GAMES), 게임 완료·즐겨찾기 추가 시점 자동 평가.
  - **닉네임/국가·지역 정책 중앙화**: `profilePolicy.ts` — 닉네임 Unicode 2~20자 + 7일 쿨다운, 국가/지역 ISO 3166-1 alpha-2 + 30일 쿨다운("국적 인증" 아님, IP 미추론).
  - **신규 API**: `GET /api/progression/me`, `GET /api/progression/leaderboard`(글로벌 XP 랭킹, 공개), `GET /api/progression/achievements`, `POST /api/profile/nickname`, `POST /api/profile/country`. `POST /api/scores` 응답에 XP/도전과제 부수효과 포함(점수 자체는 불변).
  - **계정 통합 정합성 확장**: Primary Account Wins 병합 시 Secondary의 `xp_events`/`user_progress`/`user_achievements`도 원자적으로 삭제(고스트 진행도 방지), 기존 초대 흐름 무변경.
  - **Phase B 완료 당시 범위 밖이었던 항목**: My Page/Account Center UI, Creator, Discord 연동. 이후 Phase C~H에서 구현되었으며 현재 정책은 `docs/PROGRESSION.md` §11에 정리되어 있습니다.
- **계정 식별/통합 & 즐겨찾기 접근통제 & OAuth 보안 & 브랜드 파비콘 스프린트 (Phase 11)**:
  - **계정 모델 (별도 계정 기본)**: Google/Discord 로그인을 기본적으로 별도 OwOGG 계정으로 분리하고, 동일 이메일을 자동 병합 근거로 사용하지 않음. 정규 식별자는 `provider` + `provider_user_id`(Google `sub`, Discord 사용자 ID).
  - **즐겨찾기 접근 통제 (P0)**: 게스트 즐겨찾기를 로그인 전용으로 변경 — 게스트 즐겨찾기 클릭/카테고리 칩 선택은 로그인 모달을 호출하고 로컬 즐겨찾기 미저장. 로컬스토리지 v1→v2 마이그레이션으로 기존 게스트 즐겨찾기를 폐기하고 최근 플레이만 보존. 게스트 임포트 계약/API/유즈케이스/저장소 흐름에서 `guestFavorites` 제거.
  - **OAuth 공급자 연결 (P1)**: `UserRepository` 연결 역량(getOAuthAccounts/findOAuthAccount/linkOAuthAccount/unlinkOAuthAccount), `IdentityUseCases`, 마이그레이션 `0003_account_identity.sql`(`UNIQUE(user_id, provider)`), 연결/연결해제 API 및 `ACCOUNT_ALREADY_LINKED`/`PROVIDER_ALREADY_LINKED`/`LAST_AUTH_PROVIDER` 코드. LOGIN과 LINK 흐름 명시 분리 — Discord LINK `state`는 인증 세션에 바인딩 후 콜백 재검증.
  - **Primary Account Wins 계정 통합 (P1)**: 단기/일회용 `account_merge_challenges`(마이그레이션 `0004`), `AccountMergeUseCases`(소유 증명 + 챌린지 검증 + 동일 프로바이더 충돌 가드), D1 `batch` 원자 트랜잭션(Secondary 점수/즐겨찾기/최근플레이/세션 삭제 → Secondary OAuth 이전 → Secondary 사용자 삭제). Primary 데이터 유지, Secondary 데이터 폐기, 로그인 수단만 이전. 기록 합집합 미수행.
  - **Google 보안 강화 (P2)**: `tokeninfo` 엔드포인트 대신 Google OpenID JWKS로 로컬 JWT 서명(RS256) 검증. `iss`/`aud`/`exp`/`sub` 검증 및 JWKS 캐싱. `sub` 캐노니컬 식별자, 검증 이메일은 메타데이터.
  - **프로필 계정 관리 UX (P4)**: 프로필 "연결된 로그인 계정" 섹션(연결됨/연결/연결해제), `MergeModal`(안전 요약/Primary 선택/삭제 경고/원자 확정), 연결 충돌 시 계정 통합 제안.
  - **브랜드 파비콘 (P3)**: 캐노니컬 `favicon.svg`(게임 허브 4-타일 마크), 결정론적 `scripts/generate-favicon.ts`(의존성 없는 PNG/ICO 인코더)로 favicon.ico/PNG/애플터치아이콘/`site.webmanifest` 생성, SPA 셸에 파비콘 링크 주입 및 프로덕션 자산 200 검증.

---

## 3. 🎯 다음 우선순위 (Next Priorities)

플레이어 플랫폼 확장 스프린트는 여러 세션에 걸쳐 단계적으로 진행됩니다 (`docs/WORK_PROGRESS.md`의 Next Action 참고):

1. **Phase I — Account Merge Regression, Platform Integrity & Final Sprint Verification** — 계정 통합 회귀 테스트, 플랫폼·Creator 무결성 점검, 최종 문서화 및 프로덕션 검증.
2. **Phase C 잔여**: 공개 프로필(`/profile/:id`), 필요 시 `/me`·`/account` 완전 라우트 분리.
3. **신규 미니게임 확장**: 색각 이상 테스트(color-test), 숫자 암기 테스트(number-memory), CPS 테스트(cps-test).

---

## 4. 🛠️ 알려진 기술 부채 및 결정 사항 (Technical Debt & Decisions)

1. **D1 세션 토큰 원시 저장 방식**:
   - 현재 D1SessionRepository에 세션 토큰 원시값 저장을 유지하고 있음. 프로덕션 기존 사용자 로그아웃 영향을 고려하여 향후 마이그레이션 전략 수립 후 SHA-256 토큰 해싱 도입 예정.
2. **React Router v7 SPA Mode Cloudflare 준비 프리훅 스크립트**:
   - `scripts/prepare-web-build.ts` 스크립트를 통해 `build/server` 디렉토리 유효성을 보장 중이며 사유 및 제거 조건이 주석으로 명시되어 있음.

---

## 5. 📜 주요 변경 이력 (History)

- **2026-08-13**: 프로덕션 하드닝 스프린트(Phase J) — (1) 일반/Creator 리더보드 SQL을 `ORDER BY score LIMIT N` 후 JS 중복 제거 방식에서 `ROW_NUMBER() OVER (PARTITION BY user_id ...)` 기반 SQL-레벨 개인 최고 기록 선별로 교체(한 사용자가 상위 N개 원시 행을 독점해도 다른 사용자를 밀어내지 않음, 실제 SQLite/D1 엔진으로 검증). (2) Creator `audience_count`에 `audience_count_known` 컬럼(마이그레이션 `0014`) 추가로 "공식 API 확인 0명"과 "미지"를 구분, YouTube/CHZZK/SOOP 초기 인증 어댑터의 0-기본값 버그 제거. (3) Admin Origin 검증을 정확 일치로 강화(localhost 무조건 허용 제거, `FRONTEND_URL` 자체가 localhost일 때만 개발 예외). (4) Creator provider(YouTube/Twitch/CHZZK/SOOP) client ID/secret/redirect URI를 `deploy.yml`에 완전 배선하고 `CREATOR_ENABLED_PROVIDERS` 기반 프로덕션 readiness 게이트 추가. (5) Admin Center를 `ADMIN_USER_IDS` 단독 판단에서 `ADMIN_USER_IDS` + 신선한 Google Step-Up(canonical sub 허용 목록, 5분 이내 발급, OAuth 연결 검증) + 관리자 전용 PBKDF2 비밀번호 로그인 + 30분 수명 별도 관리자 세션(마이그레이션 `0015`)의 다층 방어로 전환, 15분 로그인 실패 rate limit, `pnpm admin:password:hash` 운영 도구, `/api/admin/*` 전체(GET 포함) 관리자 세션 요구로 마이그레이션.
- **2026-08-13**: OwOGG 플레이어 플랫폼 확장 스프린트 Phase E2A(Featured Creator 자격 심사 엔진) 완수 — 순수 도메인 정책(`featuredPolicy.ts`), 심사 잡 모델(마이그레이션 `0012`), 6시간 Cron 스케줄러, 플랫폼별 공식 지표 재조회(YouTube/Twitch/CHZZK), 실패 격리·재시도·수동 심사 라우팅.
- **2026-08-13**: OwOGG 플레이어 플랫폼 확장 스프린트 Phase E2B(Featured Creator 수동 심사·재검증·관리자 안전) 완수 — 명시적 관리자 ID 권한, 보호된 심사 큐/API/UI, append-only 감사 원장(마이그레이션 `0013`), 14일 재검증 및 8,000 audience 하이스테리시스.
- **2026-08-13**: OwOGG 플레이어 플랫폼 확장 스프린트 Phase C 완료(My Page 탭 분리, 닉네임/국가 UI, 즐겨찾기/최근 플레이) + Discord 계정 연결 redirect_uri 버그 수정 + `/api/auth/me` 필드 누락 버그 수정 + 푸터 정리 + Phase F(Discord HTTP Interactions: Ed25519 서명 검증, `/owogg link|profile|games`, 1회용 연동 토큰) 완수.
- **2026-08-13**: OwOGG 플레이어 플랫폼 확장 스프린트 Phase B(진행도 파운데이션) 완수 — 서버 권위 XP 원장/일일 상한/멱등성, 결정론적 레벨 공식, 7종 초기 도전과제, 닉네임/국가·지역 정책 중앙화(쿨다운), `/api/progression/*` 및 `/api/profile/*` 신규 API, 계정 통합 시 Secondary 진행도 삭제 정합성 확장.
- **2026-08-13**: 계정 식별/통합 & 즐겨찾기 접근통제 & OAuth 보안 & 브랜드 파비콘 스프린트 완수 — Google/Discord 별도 계정 기본, 게스트 즐겨찾기 로그인 전용화 및 v1→v2 마이그레이션, OAuth 공급자 연결/연결해제, Primary Account Wins 원자 통합, Google JWT/JWKS 검증, 프로필 계정 관리 UX, OwOGG 파비콘 자산.
- **2026-08-13**: 크리티컬 버그 수정 및 게임 플레이 UX 안정화 완수 (시간 제한 검증기, 소셜 진단/Fallback UI, 썸네일 자산 복원, Memory/Typing 버그 수정, 뷰포트 확대).
- **2026-08-12**: 가짜 목 데이터 제거, `@owogg/contracts` 안전 Web API 클라이언트 도입, 게임 시도 라이프사이클 및 retry 재마운트, 60초 연속 타자속도 테스트 완수.
- **2026-08-12**: 락파일 회귀 수정, 단일 사전 품질 게이트(`pnpm verify`), 배포 커밋 출처 검증(Deployment Provenance) 도입, 타자 속도 테스트(`typing-test`) 미니게임 플러그인 추가.
- **2026-08-11**: Aim Test 미니게임 추가, @owogg/contracts API Contract 통합, API Composition Root 적용.
- **2026-08-10**: Cloudflare Workers + D1 배포 자동화 CD 구축 및 최초 프로덕션 배포 완료.
