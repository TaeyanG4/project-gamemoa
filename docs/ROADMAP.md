# GAMEMOA 향후 로드맵 (ROADMAP)

GAMEMOA는 높은 모듈성과 플러그 앤 플레이(Plug-and-Play) 게임 아키텍처 기반으로 설계된 미니게임 플랫폼입니다.  
계정 식별/통합 & 즐겨찾기 접근통제 & OAuth 보안 & 브랜드 파비콘 스프린트가 완료됨에 따라, 향후 플랫폼 사용자 경험 강화 및 신규 기능(특히 Discord 연동)이 안정적으로 진행됩니다.

---

## 🎯 1. 단기 로드맵 (Next Sprint)

### 1) Discord Integration Foundation (HTTP Interactions)

- **아키텍처 (v1)**: `discord.js` 상시 Gateway / VM / Docker 데몬 없이 **HTTP Interactions** 베이스.
  - Discord App → HTTP Interactions → Hono Worker → GAMEMOA 애플리케이션 서비스 → D1
  - 영구 WebSocket 연결, Gateway 서버, 봇 프로세스 데몬은 초기 구현에서 사용하지 않습니다.
- **명령어 후보**:
  - `/gamemoa link` — Discord 계정과 GAMEMOA 계정 연결
  - `/gamemoa profile` — 연결된 사용자 프로필/기록
  - `/gamemoa ranking` — 글로벌 랭킹
  - `/gamemoa server-ranking` — 서버 랭킹
  - `/gamemoa games` — 게임 목록
- **서버 랭킹 정책**: `server-ranking`은 **"해당 Discord 서버에서 GAMEMOA와 연결된 사용자들"**의 랭킹으로 제한합니다. 모든 서버 멤버를 대상으로 하지 않아 권한 서버 멤버 인텐트(Server Member Intent) 없이 초기 구현이 가능합니다.
- **이후 후보**: `/gamemoa challenge`, `/gamemoa daily`.

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
