# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

**GAMEMOA 플레이어 플랫폼 확장 스프린트 (My Page / Creator Ranking / Discord Community)** — 지금까지
**Phase B(진행도 파운데이션)**, **Phase C(My Page)**, **Phase F(Discord HTTP Interactions 파운데이션)**를
완료했습니다. Creator(Phase D~~E), Discord 서버 시스템/길드 XP(Phase G~~H)는 아직 착수하지 않았습니다.
전체 스프린트 단계 구조는 `docs/ROADMAP.md` §1, 상세 설계는 `docs/PROGRESSION.md`(진행도),
`docs/DISCORD_INTEGRATION.md`(Discord)를 참고하세요.

## 시작 상태 (이번 세션)

- **시작 커밋**: `18f2f3bb0df6a92969d387dbf8b4e93f5e70f507` (origin/main, 이전 세션에서 Phase C 1~3차
  증분까지 검증 완료된 상태)

---

## 완료

### Phase F: Discord HTTP Interactions (이번 세션)

- [x] **D1 마이그레이션 `0006_discord_link.sql`**: `discord_link_challenges`(원문 토큰 미저장, SHA-256
      해시만 저장, 1회용/만료 지원).
- [x] **Ed25519 서명 검증**: `apps/api/src/infrastructure/discord/signature.ts` — Cloudflare Workers
      `crypto.subtle`의 네이티브 `"Ed25519"` 알고리즘 사용(추가 의존성 없음). Node의
      `crypto.generateKeyPairSync("ed25519")`로 만든 실제 키쌍/서명으로 정상 검증·변조 거부·다른 키 거부·
      타임스탬프 불일치 거부·헤더 누락 거부를 전부 테스트.
- [x] **`POST /api/discord/interactions`**: PING→PONG, `/gamemoa link|profile|games` 라우팅, 서명 실패
      401, 미설정 시 500(전체 앱은 정상 부팅). `GET /api/discord/status`(비밀 아님, 설정 여부 확인용).
- [x] **`/gamemoa link` 계정 연동**: 1회용 해시 토큰 발급(`DiscordLinkUseCases`, 10분 만료) →
      `GET /api/discord/link/preview`(로그인 불필요, 안전한 미리보기) → `POST /api/discord/link/confirm`
      (로그인 필요) → 기존 `IdentityUseCases.linkProvider` 그대로 재사용(별도 병합 로직 없음,
      `ACCOUNT_ALREADY_LINKED` 시 기존 Primary Account Wins 통합 플로우 그대로 트리거).
- [x] **웹 `/discord/link` 페이지**: 미리보기 → 로그인 유도 → 확인 → 성공/충돌(MergeModal 재사용)/오류
      상태 전부 처리.
- [x] **명령어 등록 스크립트**: `pnpm discord:commands:register` — `apps/api/src/infrastructure/discord/commands.ts`
      가 등록 스크립트와 인터랙션 라우터의 단일 진실 공급원. 토큰 미출력, 안전한 재실행.
- [x] **문서**: `docs/DISCORD_INTEGRATION.md` 신규(아키텍처/보안/명령어/외부 설정 한국어 절차).
- [x] **테스트**: core 6 / db 5 / api 20 신규 (서명 검증 6, 라우트 6, 커맨드 핸들러 6, link 라우트 2,
      DiscordLinkUseCases 6, D1DiscordLinkRepository 5 — 일부 항목은 여러 파일에 걸침, 최종 합계는 하단 참고).

### Phase C 잔여 완료 + 버그 수정 (이번 세션)

- [x] **My Page "내 프로필"/"기록" 탭 분리 + 게임 기록 카드 UI 개선**: 이미 이전 세션에서 완료(참고용
      기록 — `docs/PROGRESS.md` Phase 13 참고).
- [x] **버그 수정: Discord 계정 연결 `잘못된 OAuth2 redirect_uri`**: LOGIN/LINK가 서로 다른
      redirect_uri를 Discord에 보내던 문제 — 단일 등록된 redirect_uri로 통합, LOGIN/LINK 구분은 state
      쿠키로 판별. Developer Portal 설정 변경 불필요, 프로덕션에서 확인 완료.
- [x] **버그 수정: `/api/auth/me` 세션 조회가 country/nickname_updated_at/country_updated_at 미반환**:
      `D1SessionRepository` SELECT 확장, `AuthUserSchema` 필드 추가.
- [x] **닉네임/국가 변경 UI + 즐겨찾기·최근 플레이 카드**: "내 프로필" 탭에 추가 완료.
- [x] **UI 정리**: 푸터 "인기 태그"/설명 문단 제거.

(위 Phase C 항목들은 실제로 **이전 세션**에서 구현·배포·검증까지 끝났으며, 이번 세션 시작 시점에 이미
`완료` 상태였습니다. 여기 다시 나열한 것은 새 세션이 반복 작업하지 않도록 하기 위함입니다.)

---

## 진행 중

- 없음.

---

## 남은 작업

`docs/ROADMAP.md` §1 단계 순서대로 진행:

- **Phase D~E: Creator 모델** — YouTube/CHZZK/SOOP/Twitch 채널 소유권 인증(공식 API/OAuth만 사용,
  스크래핑 금지), Featured Creator 심사 엔진(구독자/팔로워 + 채널 생성 기간, 6시간 자동 재심사 Cron),
  Creator 랭킹(기존 점수 재사용, 중복 저장 금지). **외부 Provider 자격증명 필요 — 착수 전 사용자와
  어느 플랫폼부터 시작할지 범위 확인 권장.**
- **Phase G: Discord 서버 시스템** — 서버 등록(권한 있는 관리자만), 서버 검색/디렉토리, vanity slug,
  서버 관리 페이지, PUBLIC/UNLISTED/PRIVATE 가시성.
- **Phase H: Discord 길드 XP** — `/gamemoa play`(길드-바인딩 플레이 컨텍스트), 길드-로컬 사용자 XP(신규
  가입 시 0부터 시작, 전역 XP와 별개), 길드 활동 XP, 주간 XP, 전역 서버 랭킹, 다중 길드 중복 방지. 이
  원장 패턴은 `docs/PROGRESSION.md`의 XP 원장 설계와 이번 세션의 `discord_link_challenges` 1회용
  토큰/해시 저장 패턴을 재사용할 예정. 완료 후 `/gamemoa rank|leaderboard|play|server` 구현.
- **Phase C 잔여(선택)**: 공개 프로필(`/profile/:id`), 필요 시에만 `/me`·`/account` 완전 라우트 분리.
- **Phase I**: 계정 통합 회귀 테스트 확장(Creator/Discord 식별자 포함), 최종 문서화.

---

## 블로커 / 외부 설정 대기

- **Discord Interactions 실사용을 위한 외부 설정**: 이 저장소만으로 완결되지 않으며 사용자의 Discord
  Developer Portal 접근이 필요합니다. 정확한 절차는 `docs/DISCORD_INTEGRATION.md` §8:
  1. Developer Portal에서 기존 GAMEMOA Application의 **Public Key** 복사.
  2. GitHub 저장소 Settings → Actions → **Variables**에 `DISCORD_PUBLIC_KEY` 추가(Secret 아님).
  3. 배포 후 Developer Portal의 **Interactions Endpoint URL**을
     `https://gamemoa-api.gamemoa.workers.dev/api/discord/interactions`로 설정.
  4. 로컬에서 `DISCORD_APPLICATION_ID=... DISCORD_BOT_TOKEN=... pnpm discord:commands:register` 실행.
  - 이 단계 전까지 `POST /api/discord/interactions`는 500을 반환하는 것이 **정상**입니다(선택적 통합
    미설정 상태이며 전체 서비스는 정상 동작).
- **Creator 플랫폼 자격증명**: Phase D~E 착수 시 YouTube/Twitch 등 OAuth Client 등록이 필요하며, 아직
  요청/설정되지 않았습니다.

---

## 다음 작업 (Next Action)

**Phase D 착수 전, Creator 플랫폼 범위를 사용자에게 먼저 확인할 것.** 4개 플랫폼(YouTube/CHZZK/SOOP/
Twitch)을 한 번에 구현하는 대신, 이전 세션들의 패턴처럼 파운데이션(스키마 + 소유권 상태 모델 + Featured
심사 정책의 순수 도메인 로직)부터 시작하고, 실제 OAuth 연동은 공식 문서를 다시 확인하며 플랫폼 1개씩
진행하는 것을 권장합니다. 대안으로 Phase G(Discord 서버 등록/검색)를 먼저 진행할 수도 있습니다 — 외부
Provider 자격증명이 필요 없고 이번 세션에서 만든 `discord_link_challenges` 패턴을 바로 재사용할 수
있어 착수 장벽이 낮습니다. 새 세션은 본 문서, `docs/ROADMAP.md`, `docs/PROGRESSION.md`,
`docs/DISCORD_INTEGRATION.md`만으로 이어서 진행 가능합니다.

---

## 마지막 검증 상태 (Last Verified State)

- **Local Quality Gate (`pnpm verify`)**: PASS (format/arch/registry/lint/typecheck/test/build)
- **Local Unit Tests**: core 74 / db 19 / api 56 / web 15 — 전원 PASS (Discord 서명 검증은 Node
  `crypto.generateKeyPairSync("ed25519")`로 만든 실제 키쌍/서명 사용)
- **D1 마이그레이션 (로컬 + 프로덕션)**: 0006 적용 성공 (기존 0000~0005 위에 additive)
- **최종 커밋 (Final SHA)**: `99dc2dd3e91e3895561a57d04b2f876fdac88ed1` (origin/main과 100% 일치)
- **GitHub Actions CI**: GREEN (run `31646841329`)
- **Cloudflare Deploy**: GREEN (run `31646920168`) — D1 프로덕션 마이그레이션 0006 적용, API/Web Worker
  배포, Health/Provenance 체크 전원 통과.
- **운영 Provenance/Smoke (`pnpm smoke:prod`)**: API `/api/health` commit = Web `/version.json` commit =
  `99dc2dd3e91e3895561a57d04b2f876fdac88ed1` (= origin/main). `/discord/link` 포함 전체 웹 라우트/자산
  HTTP 200.
- **프로덕션 직접 확인**: `GET /api/discord/status` → `{"configured":false}`(예상된 상태, 외부 설정
  대기), `POST /api/discord/interactions`(미설정) → 500(안전한 성능 저하, 전체 API는 정상), `GET
/api/discord/link/preview`(토큰 없음) → 400, `POST /api/discord/link/confirm`(미인증) → 401.
- **시작 SHA (이번 세션)**: `18f2f3bb0df6a92969d387dbf8b4e93f5e70f507`
