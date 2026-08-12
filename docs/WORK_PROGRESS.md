# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

**GAMEMOA 플레이어 플랫폼 확장 스프린트 (My Page / Creator Ranking / Discord Community)** — 지금까지
**Phase B(진행도 파운데이션)**, **Phase C(My Page)**, **Phase D(XP 랭킹 UI & Creator 모델 파운데이션)**,
**Phase F(Discord HTTP Interactions 파운데이션)**, **Phase G(Discord 서버 시스템 & 커뮤니티 Hub)**,
**Phase H1(Discord 길드 XP 귀속 파운데이션 & `/gamemoa play`)**, **Phase H2(Discord 서버 리더보드 & 커맨드)**를 완수했습니다.
전체 스프린트 단계 구조는 `docs/ROADMAP.md` §1, 상세 설계는 `docs/PROGRESSION.md`(진행도),
`docs/DISCORD_INTEGRATION.md`(Discord)를 참고하세요.

---

## 완료

### Phase E1: Creator Channel Ownership Verification (이번 세션)

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

---

## 남은 작업

`docs/ROADMAP.md` §1 단계 순서대로 진행:

1. **Phase E2 — Featured Creator Qualification, 6-hour Recheck & Manual Review**
   - Featured 수동/자동 심사 기준 수립 (최소 시청자/구독자 기준 또는 운영진 수동 심사).
   - 6시간 간격 자동 재심사 & 자격 미달 시 상태 자동 갱신 워크플로우.
2. **Phase I — 계정 통합 회귀 테스트 & 프로덕션 검증**

---

## 다음 작업 (Next Action)

`Phase E — Creator Ownership Verification & Featured Qualification Engine`
