# GAMEMOA (게임모아) 🎮

> **설치 없이 웹 브라우저에서 바로 즐기는 가벼운 웹 미니게임 모음 플랫폼**

GAMEMOA는 모듈러 모노레포(Modular Monolith) 기반으로 설계된 미니게임 플랫폼입니다.  
CrazyGames와 MiniGame.com의 검증된 UI/UX 패턴을 결합하여, 1초 만에 플레이 가능한 비주얼 스포트라이트와 고밀도 게임 카탈로그를 제공합니다.

---

## ✨ 핵심 특징 (Key Features)

- ⚡ **1초 무설치 시작**: 회원가입이나 다운로드 없이 브라우저에서 즉시 실행
- 🎨 **CrazyGames & MiniGame.com UI/UX 결합**:
  - **좌측 접이식 아이콘 사이드바**: 빠르게 카테고리(홈, 인기, 순발력, 두뇌, 랭킹)를 탐색
  - **오늘의 추천 게임 스포트라이트**: 대형 비주얼 카드와 1-클릭 실행 버튼
  - **카테고리 칩 필터 바**: 페이지 전환 없는 실시간 1-클릭 라이브 필터링
  - **16:10 고밀도 게이밍 카드**: 호버 플레이 오버레이 및 소요 시간 안내
- ⏱️ **밀리초(ms) 단위 정밀 반응속도 및 기억력 테스트 게임**: 부정클릭 방지, 5회 평균값 계산 및 S~F 등급 판정
- ☁️ **Cloudflare Free Tier Production Architecture**:
  - **Hono + Cloudflare Workers**: 고성능 서버리스 API 백엔드
  - **Cloudflare D1**: 글로벌 에지 데이터베이스 (유저, 세션, 게임 점수, 랭킹)
  - **Google & Discord OAuth**: HttpOnly 세션 기반 보안 인증
- 🔄 **Cloudflare Exit Strategy**: Hono business logic과 Repository Abstraction을 통해 Node.js + Docker + PostgreSQL 구조로의 용이한 전환 보장

---

## 🚀 로컬 실행 방법 (Quick Start)

### 1. 사전 준비 (Prerequisites)
- **Node.js**: v20 이상 (추천: v22 LTS)
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
# 코드 린트 (ESLint)
pnpm lint

# TypeScript 타입 검사
pnpm typecheck

# 단위 테스트 실행
pnpm test

# 전체 프로젝트 빌드 (Turbo build)
pnpm build
```

---

## 🏗️ 기술 스택 (Tech Stack)

| 영역 | 기술 스택 |
|---|---|
| **Frontend** | React 19, React Router v7 (Framework Mode), Tailwind CSS v4 |
| **Backend** | Hono, TypeScript, Zod Validation |
| **Database** | Cloudflare D1 (SQL) & Repository Abstraction Layer |
| **Auth** | Google OAuth (GIS), Discord OAuth 2.0, HttpOnly Cookie Session |
| **Runtime / Hosting** | Cloudflare Workers & Cloudflare Pages / Static Assets |
| **CI/CD** | GitHub Actions & Wrangler CLI |
| **Monorepo** | pnpm workspaces, Turborepo |

---

## 📁 프로젝트 구조 (Project Structure)

```text
gamemoa/
├── apps/
│   ├── web/                   # 웹 UI & SSR Server (React Router v7 + Cloudflare)
│   └── api/                   # Hono API Backend (Cloudflare Workers / Node.js portable)
├── games/
│   ├── reaction-time/         # 반응속도 테스트 게임
│   └── memory-test/           # 순서 기억력 테스트 게임
├── packages/
│   ├── auth/                  # Client Auth Service & Auth Context
│   ├── core/                  # 도메인 모델, 비즈니스 서비스 & Repository 인터페이스
│   ├── db/                    # D1 Repository 구현체, 마이그레이션 & SQL 스키마
│   ├── game-sdk/              # 게임 모듈 공통 계약 & 스코어링 인터페이스
│   ├── shared/                # Zod 공통 검증 스키마 & 타입
│   └── ui/                    # 공통 UI 컴포넌트 & GameShell
├── docs/                      # 문서 및 진행 상황 기록 (WORK_PROGRESS.md)
├── GAMEMOA_BLUEPRINT.md       # 아키텍처 및 시스템 설계 명세서
└── AGENTS.md                  # AI 코딩 및 개발 규칙 명세서
```

---

## 📜 라이선스 (License)

MIT License
