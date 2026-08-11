# GAMEMOA (게임모아) 🎮

> 설치 없이 웹 브라우저에서 바로 즐기는 가벼운 웹 미니게임 모음 플랫폼

GAMEMOA는 모듈러 모노레포(Modular Monolith) 기반으로 설계된 미니게임 플랫폼입니다.  
독립된 게임 플러그인 아키텍처를 통해 빠른 게임 추가와 우수한 사용자 경험을 제공합니다.

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

또는 웹 앱 전용 개발 서버 실행:

```bash
pnpm --filter @gamemoa/web dev
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

# 단위 테스트 실행 (node:test)
pnpm test

# 전체 프로젝트 빌드 (Turbo build)
pnpm build
```

---

## 🏗️ 기술 스택 (Tech Stack)

| 영역 | 기술 스택 |
|---|---|
| **Core** | TypeScript (Strict Mode) |
| **Framework** | React 19, React Router v7 (Framework Mode) |
| **Styling** | Tailwind CSS v4, Vanilla CSS Design System |
| **Runtime / Edge** | Cloudflare Workers |
| **Monorepo** | pnpm, Turborepo |
| **Testing** | Node.js Test Runner (`node:test`), tsx |

---

## 📁 프로젝트 구조 (Project Structure)

```text
gamemoa/
├── apps/
│   └── web/                   # 웹 UI & SSR Server (React Router v7 + Cloudflare)
├── games/
│   └── reaction-time/         # 반응속도 테스트 게임 (독립 패키지 플러그인)
├── packages/
│   ├── auth/                  # Better Auth 인증 계층
│   ├── core/                  # 비즈니스 도메인 및 포트 인터페이스
│   ├── db/                    # D1 / Drizzle ORM 스키마 & 마이그레이션
│   ├── game-sdk/              # 게임 모듈 공통 계약 & 스코어링 인터페이스
│   ├── shared/                # Zod 공통 검증 스키마 & 유틸리티
│   └── ui/                    # 공통 UI 컴포넌트 & GameShell
├── GAMEMOA_BLUEPRINT.md       # 아키텍처 및 시스템 설계 명세서
└── AGENTS.md                  # AI 코딩 및 개발 규칙 명세서
```

---

## 📜 라이선스 (License)

MIT License
