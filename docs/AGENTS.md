# AGENTS.md — GAMEMOA Coding Contract

이 파일은 AI 코딩 에이전트용 강제 규칙 요약이다.
상세 아키텍처/제품 결정과 **향후 Phase 순서**는 `GAMEMOA_BLUEPRINT.md`를 따른다. `PROGRESS.md`와 `ARCHITECTURE.md`는 현재까지 완료된 구현과 실제 구조를 확인하는 참고 자료로 사용한다.

> 현재 단계(2026-08-12): Phase 0~2 완료. **싱글 플레이 게임 추가와 로컬 품질 안정화가 최우선**이다.  
> **웹 호스팅/production 배포와 로그인(OAuth)은 후순위**이며, 사용자가 명시적으로 요청하기 전에는 구현하지 않는다.

## 1. 우선순위

1. correctness
2. architecture boundary
3. testability
4. security
5. simplicity
6. local developer stability
7. performance
8. developer experience

## 2. 작업 전

반드시 다음을 확인한다.

```text
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

## 3. 현재 작업 우선순위

현재 기본 작업 순서는 다음과 같다.

```text
1. 기존 Reaction Time 및 web shell 안정화
2. 추가 싱글 플레이 게임 구현
3. 공통 Game SDK / GameShell 재사용성 개선
4. 접근성 / 반응형 / 로딩 / 오류 상태 정리
5. 테스트와 빌드 안정화
6. 데이터/점수 백엔드
7. 로그인
8. 웹 호스팅/production 배포
9. 멀티플레이
```

다음은 **명시적 요청 전까지 착수 금지**다.

```text
Google / Discord OAuth 실제 연동
production Cloudflare 배포
production D1 생성/연결
production secret 설정
Durable Objects / realtime Worker 배포
```

## 4. 아키텍처 경계

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

게임 패키지는 플랫폼 내부 구현을 우회 import하지 않는다.
공통 계약이 필요하면 `packages/game-sdk` 또는 적절한 `packages/*`에 먼저 정의한다.

## 5. 게임 추가

새 게임은 `games/<slug>` 독립 패키지로 추가한다.

필수:

```text
manifest
Game component
rules / game logic
score strategy
tests
lazy registry entry
responsive behavior
```

게임 엔진 dependency는 해당 게임 package 안에만 둔다.
단순 게임에 불필요한 Phaser/Pixi/Three 등의 대형 엔진을 추가하지 않는다.

## 6. 인증 — 후순위

현재 Phase에서는 인증을 구현하지 않는다.
사용자가 인증 작업을 명시적으로 요청한 시점부터 다음 규칙을 적용한다.

- Better Auth
- Google + Discord only
- no password auth
- `/api/auth/*`
- provider secret client exposure 금지
- real OAuth required check를 로컬/PR CI에 강제하지 않음

## 7. DB / 서버 영속성 — 현재는 필요할 때만

데이터 백엔드 Phase에 진입하기 전에는 D1/Drizzle을 이유 없이 확장하지 않는다.
진입 후에는:

- D1 + Drizzle
- schema change는 migration only
- production destructive migration same release 금지
- expand -> migrate -> contract
- production resource는 명시적 요청 전까지 사용 금지

## 8. Validation

네트워크/스토리지 경계의 외부 입력은 `unknown`으로 받고 Zod 검증 후 사용한다.
게임 내부 pure state까지 불필요하게 Zod로 감싸지 않는다.

## 9. Error / 반복 실행 규칙

동일한 에러 메시지 또는 동일 root cause로 보이는 실패를 **새 가설 없이 반복하지 않는다.**

```text
1회 실패 -> 원인 가설 수립
2회 동일 실패 -> 반복 실행 중단, 환경/경로/config 조사
3회차 동일 명령 재시도 -> 새로운 근거/가설이 있을 때만 허용
```

동일 에러가 2회 반복되면 최소 다음을 확인한다.

```text
cwd / workspace root
Node version
pnpm version
관련 package version
pnpm-workspace.yaml
tsconfig / root config
Windows path / 권한 / symlink / drive mapping
공식 config와 현재 config 차이
```

**같은 build/dev/test를 무작정 수십 번 재실행하지 않는다.**

## 10. Windows 개발 환경 규칙

Windows에서는 짧고 단순한 SSD 경로를 우선한다.

권장 예:

```text
F:\dev\gamemoa
F:\dev\<project-name>
```

피한다:

```text
Desktop / Documents / Downloads
OneDrive 동기화 경로
과도하게 깊은 경로
불필요한 drive root 탐색
```

추가 규칙:

- `subst X:` 같은 가상 드라이브는 **기본 해결책으로 사용하지 않는다.**
- 가상 드라이브/경로 패치는 실제 재현과 진단 후 임시 workaround로만 사용한다.
- 임시 drive mapping을 만들었다면 작업 종료 시 제거 방법을 문서화한다.
- `node-linker=hoisted`는 전역 기본값이 아니다. 실제 호환성 문제가 확인될 때만 프로젝트 `.npmrc`에 이유와 함께 적용한다.
- `fixPath` 같은 경로 보정 코드는 일반 해결책으로 복제하지 않는다.
- Windows `esbuild` access error가 재발하면 먼저 workspace root와 상위 디렉터리 탐색 원인을 조사한다.

## 11. State

- URL: React Router
- server data: loader/action/API (서버 기능이 실제로 존재할 때)
- component local: React
- shared transient: Zustand selectively
- game internal: game module
- authoritative multiplayer: Durable Object (future)

## 12. Tests / 검증

변경에 필요한 최소 테스트를 반드시 함께 수정한다.
게임 rules는 가능한 pure function으로 작성한다.

작업 완료 전 실행 가능한 항목을 확인하고 실행한다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

존재하지 않는 script를 억지로 호출하지 않는다.

`pnpm dev`는 완료 검증 명령이 아니라 **장기 실행 개발 서버**다.
검증 목적으로 시작했다면 확인 후 종료한다.
사용자가 서버 유지 실행을 요청한 경우에만 background task로 남긴다.

## 13. Vibe-coding safety

다음 행동 금지:

- 큰 파일 전체 재작성으로 문제 회피
- `any`, `@ts-ignore` 남발
- unrelated dependency 추가
- 기존 abstraction 무시하고 중복 구현
- 요구하지 않은 DB/인프라/로그인/배포 생성
- secret hardcode
- production resource 사용
- 테스트 삭제로 CI 통과
- 동일 오류에 대한 무근거 반복 실행
- 임시 workaround를 영구 아키텍처처럼 확산

## 14. 작업 종료 조건

작업이 끝났다고 판단하기 전에:

```text
[ ] 목표 기능 동작
[ ] 기존 기능 회귀 없음
[ ] lint/typecheck/test/build 중 적용 가능한 검증 통과
[ ] 장기 실행 dev server / watch process 정리
[ ] 임시 파일/가상 드라이브/디버그 패치 정리
[ ] architecture boundary 확인
[ ] 문서/PROGRESS 갱신 필요 여부 확인
```

## 15. 완료 보고

항상 다음을 보고한다.

```text
변경 파일
주요 결정
실행한 검증과 결과
남은 TODO/placeholder
architecture boundary 영향
실행 중으로 남긴 task가 있는지 여부
```
