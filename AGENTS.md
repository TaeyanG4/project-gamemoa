# AGENTS.md — GAMEMOA Coding Contract

이 파일은 AI 코딩 에이전트용 강제 규칙 요약이다.
상세 결정은 `GAMEMOA_BLUEPRINT.md`를 따른다.

## 1. 우선순위

1. correctness
2. architecture boundary
3. testability
4. security
5. simplicity
6. performance
7. developer experience

## 2. 작업 전

반드시:

```text
GAMEMOA_BLUEPRINT.md 읽기
관련 package.json 읽기
관련 test 읽기
관련 contract 읽기
```

## 3. 경계

허용:

```text
apps/web -> packages/*
apps/web -> games/*
apps/realtime -> packages/*
games/* -> packages/game-sdk
games/* -> packages/ui
games/* -> packages/shared
```

금지:

```text
games/* -> apps/*
packages/core -> Cloudflare concrete API
packages/shared -> feature code
```

## 4. 게임 추가

새 게임은 `games/<slug>` 독립 패키지.

필수:

```text
manifest
Game component
score strategy
tests
lazy registry entry
```

게임 엔진 dependency는 게임 package 안에만 둔다.

## 5. 인증

- Better Auth
- Google + Discord only for MVP
- no password auth
- `/api/auth/*`
- provider secret client exposure 금지

## 6. DB

- D1 + Drizzle
- migration only
- production destructive migration same release 금지
- expand -> migrate -> contract

## 7. Validation

네트워크/스토리지 경계의 외부 입력은 `unknown`으로 받고 Zod 검증 후 사용.

## 8. Error

domain은 HTTP Response를 만들지 않는다.
adapter가 domain error를 HTTP로 변환.

## 9. State

- URL: router
- server data: loader/action/API
- component local: React
- shared transient: Zustand selectively
- game internal: game module
- authoritative multiplayer: Durable Object

## 10. Tests

변경에 필요한 최소 테스트를 반드시 함께 수정한다.

게임 rules는 가능한 pure function으로 작성한다.

## 11. CI

PR 완료 전 실행:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 12. Vibe-coding safety

다음 행동 금지:

- 큰 파일 전체 재작성으로 문제 회피
- `any`, `@ts-ignore` 남발
- unrelated dependency 추가
- 기존 abstraction 무시하고 중복 구현
- 요구하지 않은 DB/인프라 생성
- secret hardcode
- production resource 사용
- 테스트 삭제로 CI 통과

## 13. 완료 보고

항상 다음을 보고:

```text
변경 파일
주요 결정
실행한 검증
남은 TODO/placeholder
architecture boundary 영향
```
