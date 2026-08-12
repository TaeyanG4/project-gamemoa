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
- 🧩 **Game Plugin Architecture**:
  - 빌드 타임 이중 레지스트리 자동 생성기 (`pnpm generate:registry`)를 통해 새 미니게임 추가 시 중앙 웹/백엔드 로더 코드 수정 0회 달성
- 🛡️ **Clean Monorepo & Architecture Guard**:
  - `packages/core` (Domain, Application, Ports), `packages/db` (Cloudflare D1 Persistence), `@gamemoa/contracts` (Single Source of Truth Schemas)
  - CI 자동화 Architecture Guard (`pnpm verify`, `pnpm architecture:check`, `pnpm registry:check`)로 레이어 위반 및 생성 파일 이탈 자동 차단
- ☁️ **Cloudflare Free Tier Production Architecture**:
  - **Hono + Cloudflare Workers**: 고성능 서버리스 API 백엔드
  - **Cloudflare D1**: 글로벌 에지 데이터베이스 (유저, 세션, 게임 점수, 랭킹)
  - **Google & Discord OAuth**: HttpOnly 세션 기반 보안 인증
- 🔄 **Cloudflare Exit Strategy**: Hono business logic과 Repository Abstraction을 통해 Node.js + Docker + PostgreSQL 구조로의 용이한 전환 보장

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

# 코드 포맷 및 린트 검사
pnpm format:check
pnpm lint

# 아키텍처 레이어 경계 검사 & 레지스트리 최신성 검사
pnpm architecture:check
pnpm registry:check

# 게임 레지스트리 자동 생성 (Core Manifest Registry & Web Dynamic Loaders)
pnpm generate:registry

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
    └── AGENTS.md              # AI Agent 개발 규칙 명세서
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
