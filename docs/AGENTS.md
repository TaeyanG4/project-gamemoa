# AGENTS.md — GAMEMOA Coding Contract

이 파일은 AI 코딩 에이전트용 강제 규칙 요약이다.
상세 아키텍처/제품 결정과 **향후 Phase 순서**는 `GAMEMOA_BLUEPRINT.md`를 따른다. `PROGRESS.md`와 `ARCHITECTURE.md`는 현재까지 완료된 구현과 실제 구조를 확인하는 참고 자료로 사용한다.

> 현재 아키텍처 방향(2026-08-12): **Cloudflare Free Tier (Workers + Hono + D1) 기반 Production 배포**  
> GAMEMOA의 핵심 비즈니스 로직과 도메인 레이어는 Hono 및 Repository abstraction 인터페이스를 통해 Cloudflare 인프라와 격리되며, 향후 **Node.js + Docker + PostgreSQL** 환경으로 이탈(Exit Strategy) 가능한 구조를 유지한다.

## 1. 우선순위

1. correctness
2. architecture boundary (Cloudflare API direct dependency in domain forbidden)
3. testability
4. security
5. simplicity
6. local developer stability
7. performance
8. developer experience

## 2. 작업 전

반드시 다음을 확인한다.

```text
docs/WORK_PROGRESS.md 읽기 (있다면)
GAMEMOA_BLUEPRINT.md 읽기
PROGRESS.md 읽기
ARCHITECTURE.md 읽기
관련 package.json 읽기
관련 test 읽기
관련 contract 읽기
현재 working directory 확인
Node / pnpm 버전 확인
```

이미 완료된 Phase를 다시 scaffold하거나 재구축하지 않는다.
현재 코드와 테스트를 먼저 읽고, 기존 구현을 이어서 수정한다.

## 3. 작업 우선순위

현재 백엔드 및 프로덕션 전환 작업 순서는 다음과 같다.

```text
1. CI 정상화 (pnpm-lock.yaml 동기화 및 git tracked artifacts 정리)
2. architecture/docs 명세 현실화 및 AI 완료 규칙 추가
3. Hono API 구축 (apps/api) 및 Repository Abstraction 계층 정의
4. D1 데이터베이스 스키마, 마이그레이션 및 D1 Repository 어댑터 구축
5. FastAPI backend 기능 Hono 이전 (Google/Discord OAuth, Session, User, Score, Leaderboard)
6. frontend Hono API 연동 검증 및 FastAPI 제거
7. 실제 서버 데이터 기반 랭킹 및 프로필 연동
8. GitHub Actions CI/CD 및 Wrangler 배포 구성
```

## 4. 아키텍처 경계 및 종속성 격리

허용:

```text
apps/web -> packages/*
apps/web -> games/*
apps/api -> packages/*
games/* -> packages/game-sdk
games/* -> packages/ui
games/* -> packages/shared
packages/db -> packages/core
packages/auth -> packages/core
```

금지:

```text
games/* -> apps/*
packages/core -> Cloudflare concrete API (D1, Workers env directly)
route -> env.DB.prepare(...) (BAD: repository interface를 거쳐야 함)
packages/shared -> feature code
```

모든 DB 접근 및 영속화는 `Repository Interface` (예: `UserRepository`, `ScoreRepository`, `SessionRepository`)를 거치며, Cloudflare D1 바인딩 구체체는 `packages/db/src/d1/*` 에만 위치한다.

## 13. AI 작업 완료 규칙 (Strict Completion Rule)

Claude Code, Codex, Antigravity 등 모든 AI Agent는 단순히 로컬 코드 수정만 마치고 "완료"라고 보고해서는 안 된다.

**작업 완료의 정의**:
```text
작업
↓
lint (pnpm lint)
↓
typecheck (pnpm typecheck)
↓
test (pnpm test)
↓
build (pnpm build)
↓
필요한 추가 validation (D1 migration / API verification)
↓
git diff / git status 검토
↓
commit
↓
push
↓
GitHub remote commit SHA 반영 확인
↓
GitHub Actions 빌드 확인
↓
성공 시에만 최종 완료 보고
```

- Git push가 실패했거나 GitHub remote에 commit이 반영되지 않았으면 완료로 보고하지 않는다.
- CI가 실패하면 로그를 분석하여 수정 후 다시 push한다.
- 해결할 수 없는 blocker 발생 시 실패 원인을 명확히 보고한다.

## 14. Git 정책

- 절대로 `force push` (`git push -f`) 하지 않는다.
- 기존 사용자의 작업이나 커밋을 임의로 삭제하거나 되돌리지 않는다.
- 명확하고 구체적인 commit message를 작성한다.

## 15. 완료 보고 형식

작업 완료 보고 시 반드시 다음 항목을 포함한다:

- 변경한 architecture
- FastAPI → Hono 이전 상태
- D1 적용 상태
- OAuth 및 Session 상태
- score/ranking/profile 연동 상태
- Cloudflare CI/CD 상태
- 테스트 및 빌드 결과
- Git commit hash & push한 branch
- GitHub remote 반영 여부 및 GitHub Actions 결과
- 남은 blocker 또는 후속 작업

