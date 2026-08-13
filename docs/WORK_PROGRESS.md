# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

**GAMEMOA 플레이어 플랫폼 확장 스프린트 (My Page / Creator Ranking / Discord Community)** — 지금까지
**Phase B(진행도 파운데이션)**, **Phase C(My Page)**, **Phase D(XP 랭킹 UI & Creator 모델 파운데이션)**,
**Phase F(Discord HTTP Interactions 파운데이션)**, **Phase G(Discord 서버 시스템 & 커뮤니티 Hub)**,
**Phase H1(Discord 길드 XP 귀속 파운데이션 & `/gamemoa play`)**, **Phase H2(Discord 서버 리더보드 & 커맨드)**,
**Phase E1(Creator 채널 소유권 검증)**, **Phase E2A(Featured Creator 자격 심사 엔진)**,
**Phase E2B(Featured 수동 심사·재검증·관리자 안전)**를 완수했습니다.
현재 **Phase I 계정 통합 회귀·플랫폼 무결성·Admin Center·Discord 가이드 구현**을 완료하고
통합 품질 게이트와 원격 배포 검증을 진행 중입니다.
전체 스프린트 단계 구조는 `docs/ROADMAP.md` §1, 상세 설계는 `docs/PROGRESSION.md`(진행도),
`docs/DISCORD_INTEGRATION.md`(Discord), `docs/CREATOR_SYSTEM.md`(Creator)를 참고하세요.

---

## 완료

### Phase E2A: Featured Creator Qualification Engine & 6-Hour Automatic Recheck (이번 세션)

- [x] **순수 도메인 정책 (`packages/core/src/domain/featuredPolicy.ts`)**:
  - `FEATURED_POLICY` 상수: 획득 기준(구독자/팔로워 10,000 · 채널 90일), 자동 심사 기준(12,000 · 120일), 유지 기준(8,000, E2B 하이스테리시스), 심사/재시도 주기 6시간, 재시도 상한 5회, 배치 상한 50.
  - 초기 심사(콜백 스냅샷)는 절대 `FEATURED`를 부여하지 않음 — `AUTO_REVIEW_PENDING`/`NOT_ELIGIBLE`/`MANUAL_REVIEW`만 결정, 지표 누락 시 추정 금지.
- [x] **심사 잡 모델 (D1 마이그레이션 `0012_creator_review_jobs.sql`)**:
  - `creator_review_jobs` 테이블 + `D1CreatorReviewRepository` (멱등 `createOrResetJob`/`completeJob`, 바운디드 `listDuePendingJobs`, `markJobFailed`).
- [x] **6시간 자동 재심사 스케줄러 (Cloudflare Cron `0 */6 * * *`)**:
  - `apps/api/src/index.ts` `scheduled` 핸들러 → `runDueFeaturedReviews` (잡 단위 실패 격리, 재시도 5회 초과 시 `MANUAL_REVIEW` 종결).
- [x] **플랫폼별 공식 지표 재조회**:
  - YouTube `channels?part=snippet,statistics&key=YOUTUBE_API_KEY` (공개 API), Twitch App Access Token + `helix/users` + `helix/channels/followers` (total), CHZZK `open/v1/channels` (생성일 미제공 → `MANUAL_REVIEW`), SOOP 미지원(사용자 토큰 필요) → `MANUAL_REVIEW`.
  - 사용자 OAuth 토큰 미저장 원칙 유지 (app-level/공개 API 전용).
- [x] **API & 계약**:
  - `GET /api/creators/me`에 `featuredReview` 상태 및 계정 지표(`audienceCount`, `channelCreatedAt`, `metricsSyncedAt`) 포함 (`packages/contracts` DTO 확장).
- [x] **웹 UI (`apps/web/app/routes/profile.tsx`)**:
  - "Featured 심사 상태" 카드: ★ Featured Creator / 자동 심사 대기 / 추가 확인 필요 / 기준 미달 / 재시도 대기 표시.
- [x] **테스트**: `featuredPolicy.test.ts` (정책 결정 매트릭스) & `featuredReviewUseCases.test.ts` (승급/탈락/수동심사/실패 격리/재시도 상한/멱등/스코어 불변) & 스케줄러 통합 테스트 전원 그린.
- [x] **한국어 문서화 (`docs/CREATOR_SYSTEM.md` §6)**: 정책, 잡 모델, 스케줄러, 플랫폼 매트릭스, E2B 예고.

### Phase E2B: Featured Creator Manual Review, Revalidation & Admin Safety (이번 세션)

- [x] **관리자 권한 안전장치**:
  - 서버 바인딩 `ADMIN_USER_IDS`의 명시적 GAMEMOA 사용자 ID만 허용하며, 미설정 기본값은 관리자 없음.
  - 이메일/닉네임/Discord 이름/Creator 상태/provider identity를 권한 근거로 사용하지 않음.
- [x] **수동 심사 큐 및 API/UI**:
  - `GET /api/admin/creators/reviews`, `POST /api/admin/creators/reviews/:jobId/action`, `/admin/creators` 구현.
  - 소유권·플랫폼·채널·공식 지표 등 자격 관련 데이터만 노출하고 토큰/secret/내부 오류는 제외.
  - `APPROVE_FEATURED`/`REJECT_FEATURED`/`KEEP_FOR_REVIEW`, 필수 결정 사유, 검증된 소유권 승인 가드 구현.
- [x] **감사 원장 (D1 마이그레이션 `0013_creator_review_e2b.sql`)**:
  - `creator_review_audit_log` append-only 테이블 및 UPDATE/DELETE 차단 트리거.
  - 승인·거절·검토 유지 결정의 reviewer/action/reason/상태 전이/안전한 지표 snapshot 기록.
- [x] **Featured 재검증**:
  - 기존 Featured와 취득 심사를 `review_type`으로 분리.
  - 14일 중앙 cadence, bounded batch, 재시도/멱등성 유지.
  - audience 8,000 이상 유지, 8,000 미만 철회, 일시 오류/지표 불가 수동 심사, 공식 삭제·철회 확정 시 철회.
- [x] **Creator UX 무결성**:
  - 운영진 내부 사유는 Creator API/UI에 노출하지 않음.
  - Featured 상태는 표시·필터링 전용이며 score/XP/ranking에 영향 없음.
- [x] **테스트**: 관리자 거부/허용/기본 거부, 승인 소유권 가드, 사유 필수, 승인·거절·감사·재전송, 14일 재검증 유지/철회/실패 격리/수동 라우팅/삭제 확정 테스트.

### Phase E1: Creator Channel Ownership Verification (이전 세션)

- [x] **D1 마이그레이션 `0011_creator_metrics.sql`**:
  - `creator_platform_accounts` 테이블에 `audience_count`, `channel_created_at`, `metrics_synced_at` 가산 컬럼 추가.
- [x] **검증 원칙 준수**:
  - 셀프 텍스트 입력, 디스플레이 네임 일치, 이메일 일치, 핸들 텍스트 입력 검증 절대 금지.
  - 공식 OAuth 2.0 / 공식 API 전용 (웹 스크래핑 금지).
  - 단일 소유권 인바리언트 (`UNIQUE(platform, platform_user_id)`).
  - 인증에 사용된 임시 Access Token은 정품 채널 프로필/Canonical ID 조회 후 즉시 폐기하며 DB에 저장하지 않음.
- [x] **도메인 & 어댑터 아키텍처**:
  - Domain Port: `CreatorChannelInfo` & `CreatorProviderAdapter` (`packages/core/src/ports/creatorProvider.ts`)
  - API Infrastructure: `YouTubeCreatorProvider`, `TwitchCreatorProvider`, `ChzzkCreatorProvider`, `SoopCreatorProvider`, `MockCreatorProvider` (`apps/api/src/infrastructure/creators/`)
- [x] **API 엔드포인트 구현 (`apps/api/src/routes/creators.ts`)**:
  - `GET /api/creators/providers`: 자격 증명 설정 상태 확인 (비비밀)
  - `GET /api/creators/verify/:platform`: CSRF State 쿠키 생성 및 OAuth 인증 요청 리다이렉트
  - `GET /api/creators/verify/:platform/callback`: OAuth Callback 수신, 토큰 교환, 소유권 확인, 세션 유저 검증, 단일 소유권 확인 및 프로필 업데이트
- [x] **웹 프론트엔드 내 프로필 확장 (`apps/web/app/routes/profile.tsx`)**:
  - "크리에이터 채널 소유권 인증" 카운터 카드 추가 (YouTube, CHZZK, SOOP, Twitch)
  - 소유권 인증 완료 배지 및 채널 링크 표시 (`✓ GAMEMOA가 해당 사용자의 채널 소유권을 공식 API로 확인했습니다.`)
  - 미설정 시 안전한 비활성화 배지 ("현재 인증을 사용할 수 없습니다") 표시
- [x] **상세 한국어 문서화 (`docs/CREATOR_SYSTEM.md`)**:
  - 아키텍처, 검증 원칙, 보안 모델, Canonical ID 매핑 및 개발자 포털 설정 안내 명시.
- [x] **단위/통합 테스트**: `creatorOwnership.test.ts` (108/108) & `creators.test.ts` (68/68) 그린.

### Phase D: XP Ranking UI & Creator Model Foundation (이전 세션)

- [x] **D1 마이그레이션 `0010_creator_foundation.sql`**
- [x] **계정 원칙 준수 & 계층적 아키텍처 수호**
- [x] **랭킹 & 통합 정보 구조 (IA) 완성 (`/ranking`)**

### Phase I 구현: 계정 통합·관리자 센터·Discord 안내

- [x] **Primary Account Wins 전체 무결성**:
  - Primary score/Favorites/Recent Plays/profile/XP/progression/achievements는 유지하고 Secondary 경쟁·활동 데이터는 합산하지 않고 삭제.
  - Secondary `xp_events`에서 파생된 `discord_guild_xp_events`를 XP 삭제 전에 명시적으로 제거하여 Guild XP ghost 방지.
  - Discord guild manager/등록자/대기 등록 challenge/Play Context는 안전하게 Primary로 재지정하고 Guild XP는 복사하지 않음.
  - Creator 충돌 없는 외부 채널은 account ID와 심사 잡을 보존한 채 Primary profile로 이전하며, 같은 플랫폼의 서로 다른 채널 충돌은 병합 차단.
  - `creator_review_audit_log`는 수정·삭제하지 않으며 동일 provider 충돌, challenge 재사용, 실패 원자성 회귀를 유지.
- [x] **전용 Admin Center**: `/admin`, `/admin/creators`, `/api/admin/me`, `/api/admin/overview` 추가. HttpOnly 세션과 명시적 `ADMIN_USER_IDS`만 서버 권한 근거로 사용하고 기본 거부.
- [x] **관리자 보안**: 관리자 변경 Origin 검증, 엄격한 Zod payload/query 검증, `Cache-Control: no-store`, noindex, 민감값·내부 오류 비노출.
- [x] **Discord 사용자/운영자 안내**: `docs/ADMIN_GUIDE.md`, `docs/DISCORD_BOT_GUIDE.md`, `/discord/guide` 추가 및 Discord Hub 연결. 실제 구현된 7개 명령어와 글로벌/Guild XP 분리 정책을 반영.
- [x] **쿼리 무결성**: invalid query 자동 기본값 제거, game ID 검증, Creator 랭킹 SQL parameter binding, 공개 검색 wildcard escape, PRIVATE Guild 일반 응답 비노출.

---

## 남은 작업

1. 로컬 `pnpm verify`와 D1 migration/registry 검증
2. 커밋·푸시 후 GitHub Actions CI 및 Cloudflare Deploy GREEN 확인
3. `/api/health`, `/version.json`, `pnpm smoke:prod`의 최종 SHA provenance 확인
4. 외부 설정 항목(Discord Portal endpoint/명령어 등록, `ADMIN_USER_IDS`, 선택적 설치 링크)의 실제 설정 여부 확인

---

## 다음 작업 (Next Action)

`Phase I 로컬 품질 게이트 완료 후 커밋·원격 CI/Deploy·Provenance·프로덕션 smoke 검증`
