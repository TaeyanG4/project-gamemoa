# GAMEMOA (게임모아) 🎮

> **설치 없이 웹 브라우저에서 바로 즐기는 가벼운 웹 미니게임 모음 플랫폼**

GAMEMOA는 **Game Plugin Architecture** 및 **Clean Layered Monorepo Architecture** 기반으로 설계된 미니게임 플랫폼입니다.  
CrazyGames와 MiniGame.com의 검증된 UI/UX 패턴을 결합하여, 1초 만에 플레이 가능한 비주얼 스포트라이트와 고밀도 게임 카탈로그를 제공합니다.

---

## ✨ 핵심 특징 (Key Features)

- ⚡ **1초 무설치 시작**: 회원가입이나 다운로드 없이 브라우저에서 즉시 실행
- 🎨 **CrazyGames & MiniGame.com UI/UX 결합**:
  - **좌측 접이식 아이콘 사이드바**: 빠르게 카테고리(홈, 인기, 순발력, 두뇌, 랭킹)를 탐색
  - **오늘의 추천 게임 스포트라이트**: 대형 비주얼 카드와 1-클릭 실행 버튼
  - **카테고리 칩 필터 바**: 페이지 전환 없는 실시간 1-클릭 라이브 필터링
  - **16:10 고밀도 게이밍 카드**: 호버 플레이 오버레이 및 소요 시간 안내
- 🎮 **게이머 필수 테스트 미니게임 컬렉션**:
  - ⏱️ **반응속도 테스트 (Reaction Time)**: 밀리초(ms) 단위 반응속도 측정 및 S~F 등급 판정
  - 🧠 **순서 기억력 테스트 (Memory Test)**: 패턴 시퀀스 암기 및 최고 레벨 도전
  - 🎯 **에임 테스트 (Aim Test)**: 31개 무작위 타겟 정밀 타격 반응속도 측정 (반응형 아레나 지원)
  - ⌨️ **타자 속도 테스트 (Typing Test)**: 60초간 연속 문장 입력 및 WPM/CPM/정확도 실시간 측정
- ⭐️ **사용자 맞춤화 레이어 (Personalization & Account Foundation)**:
  - 📜 **최근 플레이 (Recent Plays)**: 실제 게임 시작 시점(`game_started`)에 타임스탬프 자동 기록 및 최근 플레이 탭 제공
  - ⭐ **즐겨찾기 (Favorites, 로그인 전용)**: 게임 카드 북마크, 카테고리 칩 필터링 및 홈 화면 전용 섹션 — 게스트는 즐겨찾기 클릭 시 로그인 유도(게스트 즐겨찾기 미저장). 레거시 v1 게스트 즐겨찾기는 안전한 v2 마이그레이션으로 폐기되며 최근 플레이만 보존됨
  - 🔐 **계정 식별/통합 (Account Identity & Merge)**: Google/Discord 로그인은 기본적으로 별도 GAMEMOA 계정(이메일 자동 병합 금지). 사용자 명시 요청 시 **Primary Account Wins** 계정 통합(Primary 데이터 유지, Secondary 데이터 삭제, Secondary 로그인 수단은 Primary로 이전). D1 원자 트랜잭션 기반
  - 🔗 **연결된 로그인 계정 관리**: 프로필에서 Google/Discord 연결/연결해제 및 충돌 시 계정 통합 UI 제공
  - 🔒 **SHA-256 세션 보안 & Google ID Token JWT/JWKS 검증**: 세션 토큰 해싱 저장 및 Google OpenID JWKS 기반 RS256 서명/iss/aud/exp/sub 검증(`tokeninfo` 비의존)
  - 💾 **게스트 로컬스토리지 & 계정 D1 동기화**: 로그인 없이 최근 플레이를 로컬스토리지에 보존하며, 로그인 시 계정 D1로 안전한 1-Way 최근 플레이 통합(게스트 즐겨찾기는 미통합)
- 🎨 **GAMEMOA 브랜드 파비콘**: 4-타일 게임 허브 마크의 캐노니컬 `favicon.svg` + 결정론적 생성 PNG/ICO/애플터치아이콘/`site.webmanifest`
- 🏆 **진행도 시스템 (XP / 레벨 / 도전과제)**: 서버 권위 XP(인증된 게임 완료 1회당 +10, 사용자×게임×UTC일 기준 최대 10회 상한), `xp_events` 원장 기반 멱등 지급, 결정론적 레벨 공식(`100×(L-1)²`), 7종 초기 도전과제(FIRST_PLAY/PLAY_10/PLAY_100/FIRST_FAVORITE/LEVEL_5/LEVEL_10/ALL_GAMES), 글로벌 XP 리더보드. 게임 점수(실력)와 XP(활동)는 항상 분리되어 랭킹 무결성을 해치지 않습니다. 자세한 내용은 `docs/PROGRESSION.md` 참고.
- 📊 **My Page ("내 프로필 & 기록")**: `/profile`의 "내 프로필"(사용자 정보, 레벨/XP, 닉네임·국가/지역 변경, 즐겨찾기, 최근 플레이, 연결된 로그인 계정) / "기록"(도전과제, 게임별 최고 기록) 탭 분리. 게임 기록 카드는 실제 썸네일 기반으로 재구성.
- 🎥 **Creator & Featured 시스템**: YouTube/CHZZK/SOOP/Twitch 공식 소유권 검증, Featured 자격 자동 심사, 14일 보수적 재검증, 지정된 `ADMIN_USER_IDS` 관리자 전용 수동 심사 큐와 append-only 감사 원장. Featured는 게임 점수·XP·랭킹에 영향을 주지 않습니다. 상세 정책은 `docs/CREATOR_SYSTEM.md` 참고.
- 🤖 **Discord HTTP Interactions & 커뮤니티 Hub**:
  - `discord.js` Gateway/봇 데몬 없이 서명(Ed25519) 검증 기반 슬래시 커맨드(`/gamemoa games|link|profile|play|rank|leaderboard|server`).
  - **Discord 서버 시스템 & Hub 페이지**: OAuth `guilds` 1회용 인증으로 `MANAGE_GUILD`/`ADMINISTRATOR` 권한 검증 후 서버 등록, 1회용 해시 챌린지 기반 access_token 미저장 보안, 공개 디렉토리 검색(`/discord/servers`), 공개 서버 페이지(`/discord/servers/:slug`), 가시성(`PUBLIC`/`UNLISTED`/`PRIVATE`), 서버 관리 페이지. 일반 GAMEMOA 게임 랭킹과 Discord 서버 공간은 명확히 분리되어 동작합니다. 자세한 내용은 `docs/DISCORD_INTEGRATION.md` 참고.
  - **Discord 사용 안내**: `/discord/guide` 공개 사용 가이드와 `docs/DISCORD_BOT_GUIDE.md` 운영 가이드 제공. 앱 설치와 GAMEMOA 서버 등록은 별도 단계이며 기존 글로벌 XP는 새 Guild로 복사되지 않습니다.
- 🛡️ **보안 Admin Center**: `/admin`은 HttpOnly 세션과 서버의 `ADMIN_USER_IDS`만으로 권한을 판단하며, Creator 수동 심사(`/admin/creators`)와 감사 요약을 통합합니다. 관리자 페이지는 검색 색인에서 제외됩니다. 설정 절차는 `docs/ADMIN_GUIDE.md` 참고.

- 🧩 **Game Plugin Architecture**:
  - 빌드 타임 이중 레지스트리 자동 생성기 (`pnpm generate:registry`)를 통해 새 미니게임 추가 시 중앙 웹/백엔드 로더 코드 수정 0회 달성
- 🛡️ **Clean Monorepo & Architecture Guard**:
  - `packages/core` (Domain, Application, Ports), `packages/db` (Cloudflare D1 Persistence), `@gamemoa/contracts` (Single Source of Truth Schemas)
  - CI 자동화 Architecture Guard (`pnpm verify`, `pnpm architecture:check`, `pnpm registry:check`)로 레이어 위반 및 생성 파일 이탈 자동 차단
- ☁️ **Cloudflare Free Tier Production Architecture**:
  - **Hono + Cloudflare Workers**: 고성능 서버리스 API 백엔드
  - **Cloudflare D1**: 글로벌 에지 데이터베이스 (유저, 세션, 게임 점수, 랭킹, 개인화 데이터)
  - **Google & Discord OAuth**: HttpOnly 세션 기반 보안 인증 (코드/서버 완료, 외부 프로바이더 설정 가이드 `docs/runbooks/oauth-setup.md` 제공)
- 🔄 **Cloudflare 이탈 전략 (Exit Strategy)**: Hono 이식 가능 웹 표준 아키텍처와 Repository Abstraction을 통해 Node.js + Docker + PostgreSQL 구조로의 용이한 전환 고려

---

## 🚀 로컬 실행 방법 (Quick Start)

### 1. 사전 준비 (Prerequisites)

- **Node.js**: v22 LTS 이상
- **pnpm**: v9 이상

```bash
npm install -g pnpm
```

### 2. 의존성 설치 (Install Dependencies)

```bash
pnpm install
```

### 3. 개발 서버 실행 (Run Dev Server)

```bash
pnpm dev
```

웹 앱 전용 실행:

```bash
pnpm --filter @gamemoa/web dev
```

API 백엔드 전용 실행:

```bash
pnpm --filter @gamemoa/api dev
```

### 4. 웹 페이지 접속 (Open Page)

브라우저 주소창에 아래 주소를 입력하여 접속합니다:

👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🛠️ 검증 및 빌드 스크립트 (Scripts)

```bash
# 단일 통합 품질 게이트 (락파일, 포맷, 아키텍처, 레지스트리, 린트, 타입, 테스트, 빌드)
pnpm verify

# 프로덕션 상태 및 SHA 검증 (시간 제한 & 무한 대기 방지 검사)
pnpm smoke:prod

# 프로덕션 소셜 로그인 설정 및 진단 상태 검사
pnpm auth:prod:check

# 코드 포맷 및 린트 검사
pnpm format:check
pnpm lint

# 아키텍처 레이어 경계 검사 & 레지스트리 최신성 검사
pnpm architecture:check
pnpm registry:check

# 게임 레지스트리 자동 생성 (Core Manifest Registry & Web Dynamic Loaders)
pnpm generate:registry

# GAMEMOA 파비콘/아이콘 자산 결정론적 생성 (favicon.svg -> favicon.ico/PNG/manifest)
pnpm generate:favicon

# 새 게임 스캐폴딩 생성
pnpm generate:game <game-slug>

# TypeScript 타입 검사 & 단위 테스트
pnpm typecheck
pnpm test

# 전체 프로젝트 빌드 (Turbo build)
pnpm build
```

---

## 🏗️ 기술 스택 (Tech Stack)

| 영역                  | 기술 스택                                                      |
| --------------------- | -------------------------------------------------------------- |
| **Frontend**          | React 19, React Router v7 (SPA Mode), Tailwind CSS v4          |
| **Backend**           | Hono, TypeScript, Zod Validation                               |
| **Database**          | Cloudflare D1 (SQL) & Repository Abstraction Layer             |
| **Auth**              | Google OAuth (GIS), Discord OAuth 2.0, HttpOnly Cookie Session |
| **Runtime / Hosting** | Cloudflare Workers & Cloudflare Workers Static Assets          |
| **CI/CD**             | GitHub Actions & Wrangler CLI                                  |
| **Monorepo**          | pnpm workspaces, Turborepo                                     |

---

## 📁 프로젝트 구조 (Project Structure)

```text
gamemoa/
├── apps/
│   ├── web/                   # React Router v7 SPA 웹 프론트엔드
│   └── api/                   # Hono API Backend (Workers / Node.js portable)
├── games/
│   ├── reaction-time/         # 반응속도 테스트 게임 (@gamemoa/game-reaction-time)
│   ├── memory-test/           # 순서 기억력 테스트 게임 (@gamemoa/game-memory-test)
│   ├── aim-test/              # 에임 테스트 게임 (@gamemoa/game-aim-test)
│   └── typing-test/           # 타자 속도 테스트 게임 (@gamemoa/game-typing-test)
├── packages/
│   ├── contracts/             # Zod 요청/응답 스키마 & API Single Source of Truth
│   ├── core/                  # Pure Domain, Application Use Cases & Ports (No Infra/Browser deps)
│   ├── db/                    # Cloudflare D1 Repository 구현체 & SQL schema (Persistence Adapter)
│   ├── game-sdk/              # 게임 모듈 공통 계약 & 스코어링 인터페이스
│   ├── shared/                # Zod 공통 검증 스키마 & 타입
│   └── ui/                    # 공통 UI 컴포넌트 & GameShell
├── scripts/                   # Architecture Guard, Registry Generator & SPA Build 스크립트
└── docs/                      # 아키텍처, 시스템 설계, 작업 진행 상황 & 로드맵
    ├── ARCHITECTURE.md        # 레이어 의존성 & 플러그인 아키텍처 명세서
    ├── GAMEMOA_BLUEPRINT.md   # 전체 시스템 블루프린트
    ├── PROGRESS.md            # 기능별 구현 진행 현황
    ├── WORK_PROGRESS.md       # CI/CD 및 작업 진행 상황
    ├── ROADMAP.md             # 플랫폼 향후 로드맵
    ├── PROGRESSION.md         # XP/레벨/도전과제 진행도 시스템 설계
    ├── DISCORD_INTEGRATION.md # Discord HTTP Interactions 아키텍처 및 설정 가이드
    ├── DISCORD_BOT_GUIDE.md   # Discord 서버 관리자/사용자/운영자 실무 가이드
    ├── ADMIN_GUIDE.md         # Admin Center 권한 및 운영 가이드
    ├── AGENTS.md              # AI Agent 개발 규칙 명세서
    └── runbooks/
        ├── oauth-setup.md        # 소셜 로그인 설정 런북
        └── account-linking.md    # 계정 연결/통합(Pimary Account Wins) 런북
```

---

## ☁️ 배포 파이프라인 (Deployment Pipeline)

GAMEMOA는 **GitHub Actions**와 **Wrangler CLI**를 통해 Cloudflare Workers에 자동 배포됩니다:

```text
git push origin main
  └─► GitHub Actions CI (frozen install ➔ format ➔ lint ➔ architecture ➔ registry ➔ typecheck ➔ test ➔ build)
        └─► GitHub Actions CD (D1 Migration ➔ API Worker 배포 ➔ API Health Check ➔ Web Worker 배포 ➔ Web Smoke Check ➔ Provenance Check)
```

---

## 📜 라이선스 (License)

MIT License
