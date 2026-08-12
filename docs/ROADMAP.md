# GAMEMOA 향후 로드맵 (ROADMAP)

GAMEMOA는 높은 모듈성과 플러그 앤 플레이(Plug-and-Play) 게임 아키텍처 기반으로 설계된 미니게임 플랫폼입니다.  
계정 식별/통합 & 즐겨찾기 접근통제 & OAuth 보안 & 브랜드 파비콘 스프린트 완료 이후, GAMEMOA는 "미니게임 모음"에서
**경쟁형 플레이어 플랫폼**(개인 진행도/XP/레벨/도전과제, My Page, Creator 생태계, Discord 커뮤니티 경쟁)으로
확장하는 대형 스프린트를 여러 세션에 걸쳐 진행합니다. 이 로드맵은 그 스프린트의 단계 구조를 반영합니다.

> 📌 **진행 원칙**: 기존 아키텍처(pnpm/Turborepo/React 19/Hono/Cloudflare Workers/D1/Zod contracts/Modular
> Monolith), UI 정체성, 랭킹 무결성(XP/Creator/Discord는 게임 점수에 영향 없음), OAuth 계정 정책(별도 계정 기본,
> Primary Account Wins), 게스트 정책을 그대로 보존합니다. 상세 단계별 진행 상태는 `docs/WORK_PROGRESS.md`를
> 참고하세요.

---

## 🎯 1. 진행 중인 대형 스프린트 — 플레이어 플랫폼 확장

| Phase | 내용                                                                       | 상태                                                                                          |
| ----- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| B     | 진행도 파운데이션 (XP/레벨/도전과제, 닉네임·국가 정책)                     | ✅ 완료                                                                                       |
| C     | My Page(내 프로필/기록 탭) / 닉네임·국가 변경 UI / 즐겨찾기·최근 플레이    | ✅ 완료 (공개 프로필 `/profile/:id`, `/me`·`/account` 완전 라우트 분리는 보류)                |
| D     | XP 랭킹 UI, Creator 모델 기초                                              | 예정                                                                                          |
| E     | Creator 채널 소유권 인증 + Featured 심사 엔진 (6시간 자동 재심사)          | 예정                                                                                          |
| F     | Discord HTTP Interactions, 서명 검증, 계정 연결, 기본 명령어               | ✅ 완료 (`games`/`link`/`profile`) — `rank`/`leaderboard`/`play`/`server`는 Phase H 선행 필요 |
| H1    | Discord 길드 XP 귀속 파운데이션 & `/gamemoa play`                          | ✅ 완료                                                                                       |
| H2    | Discord 서버 랭킹 UI 및 슬래시 커맨드 (`/gamemoa rank/leaderboard/server`) | 예정                                                                                          |
| I     | 계정 통합 회귀 테스트, 최종 문서화, 프로덕션 검증                          | 예정                                                                                          |

세부 정책(XP 지급/상한/멱등성, 레벨 공식, 도전과제 목록)은 `docs/PROGRESSION.md`를 참고하세요.

### Discord Integration Foundation (HTTP Interactions) — Phase F 완료, 상세는 `docs/DISCORD_INTEGRATION.md`

- **아키텍처 (v1, 구현됨)**: `discord.js` 상시 Gateway / VM / Docker 데몬 없이 **HTTP Interactions** 베이스.
  - Discord App → HTTP Interactions → Hono Worker → GAMEMOA 애플리케이션 서비스 → D1
  - 영구 WebSocket 연결, Gateway 서버, 봇 프로세스 데몬은 사용하지 않습니다.
- **구현된 명령어**: `/gamemoa link`(계정 연동), `/gamemoa profile`(연동 계정 요약), `/gamemoa games`(게임
  목록, 매니페스트 기반).
- **Phase H 선행 필요(미구현)**: `/gamemoa rank`, `/gamemoa leaderboard`, `/gamemoa play`,
  `/gamemoa server` — Discord 길드-로컬 XP 원장이 있어야 의미가 있는 명령어입니다.
- **서버 랭킹 정책(예정)**: 서버 랭킹은 **"해당 Discord 서버에서 GAMEMOA와 연결된 사용자들"**의 랭킹으로
  제한합니다. 모든 서버 멤버를 대상으로 하지 않아 권한 서버 멤버 인텐트(Server Member Intent) 없이 구현
  가능합니다.
- **외부 설정 대기**: `DISCORD_PUBLIC_KEY` GitHub Actions Variable 등록, Developer Portal Interactions
  Endpoint URL 설정, `pnpm discord:commands:register` 실행 — 전부 사용자의 Discord Developer Portal
  접근이 필요해 이 저장소만으로는 완결되지 않습니다. 정확한 절차는 `docs/DISCORD_INTEGRATION.md` §8 참고.

---

## 🚀 2. 중기 로드맵 (Quarterly)

### 1) Discord 참여 고도화 (향후)

- 서버 연결 사용자 랭킹 리더보드 및 글로벌 리더보드
- 주간 Top 3 자동 게시
- 일일 챌린지 및 챌린지 링크
- 게임 결과 공유
- 업적/랭크 역할(Role) 부여
- 신규 게임 출시 안내
- 시즌 랭킹
- 서버 구성 설정
- Rich Presence / 계정 연결 고도화

### 2) 사용자 경험(UX) 및 소셜 참여 고도화

- **다크 모드 / 테마 스위처**: Tailwind CSS v4 토큰을 활용한 부드러운 테마 전환.
- **음향 효과 온/오프 (Sound Effects)**: 게임 클릭, 완료, 재도전 시 Web Audio 효과음 선택 기능.
- **개인 최고 기록 점수 카탈로그 카드**: 개인 기록을 Canvas 이미지로 다운로드하거나 SNS로 공유하는 기능.
- **주간 랭킹 리셋 & 배지 시스템**: 주간 단위 랭킹 리셋 및 업적 달성 배지 부여.

### 3) 신규 테스트 미니게임 확충

`pnpm generate:game <slug>` CLI 명령어를 통한 DX 친화적 게임 카탈로그 확장:

- 🎨 **색각 이상 테스트 (color-test)**: 제한 시간 내 다른 색상 타일 찾기.
- 🔢 **숫자 암기 테스트 (number-memory)**: 순차적으로 길어지는 숫자 암기 및 입력.
- 🖐️ **CPS 테스트 (cps-test)**: 10초간 초당 클릭 횟수 측정.

---

## 🔮 3. 장기 로드맵 (Long-Term)

### 1) 실시간 멀티플레이어 (Realtime Multiplayer)

- Cloudflare Durable Objects 및 WebSockets 기반 1v1 반응속도 및 에임 대전방 구축 검토.

---

## ☁️ 4. Cloudflare 이탈 전략 (Exit Strategy)

GAMEMOA는 핵심 도메인 로직과 저장소 인터페이스를 명확하게 분리하여 미래 인프라 전환 가능성을 고려해 설계되었습니다:

- **API 엔진**: `@gamemoa/api` (Hono 기반)는 Hono의 이식 가능 웹 표준 아키텍처를 활용하여 Cloudflare Workers뿐만 아니라 Node.js (`@hono/node-server`), Bun, Deno, Docker 컨테이너 환경으로 유연하게 이식이 가능합니다.
- **영속성 어댑터**: `packages/core`의 저장소 인터페이스 (`ScoreRepository`, `UserRepository`, `SessionRepository`)를 따르므로, Cloudflare D1 전용 어댑터 이면에 의존성을 격리하여 향후 PostgreSQL/MySQL ORM 어댑터 변경 시 핵심 비즈니스 로직 수정 범위를 최소화합니다.
