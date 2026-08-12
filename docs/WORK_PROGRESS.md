# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

`pnpm-lock.yaml` 락파일 동기화 회귀 수정, 단일 사전 통합 품질 게이트 (`pnpm verify`) 도입, 배포 커밋 SHA 출처 검증(Deployment Provenance) 구축 및 신규 타자 속도 테스트(`typing-test`) 미니게임 플러그인 구현 완수.

## 시작 상태

- **Commit A (Foundation Repair & Provenance)**: `1144adc` (Pushed & Remote Green Verified)
- **Commit B (Typing Test Mini-Game)**: Ready for Commit & Push
- **Local Quality Gate (`pnpm verify`)**: 13/13 패키지 전원 PASS 통과
- **Production Status**: API `https://gamemoa-api.gamemoa.workers.dev/api/health` (`200 OK`), Web `https://gamemoa-web.gamemoa.workers.dev/` (`200 OK`)

## 완료 (Completed)

- [x] **P0: 락파일 동기화 회귀 수정 (`pnpm-lock.yaml`)**
  - `packages/core/package.json` 및 `apps/web/package.json` 의존성 변경 사항을 `pnpm install`로 `pnpm-lock.yaml`에 반영 완료.
  - `pnpm install --frozen-lockfile` 성공 통과.
- [x] **P0: 통합 사전 품질 게이트 스크립트 추가 (`pnpm verify`)**
  - Root `package.json`에 `pnpm verify` (`frozen-lockfile` + `format:check` + `architecture:check` + `registry:check` + `lint` + `typecheck` + `test` + `build`) 추가.
- [x] **P0: 배포 커밋 SHA 출처 검증 (Deployment Provenance)**
  - API `GET /api/health` 응답에 `commit` SHA 필드 노출.
  - Web SPA 빌드 프리훅(`scripts/prepare-web-build.ts`)에서 `public/version.json` 정적 자산 자동 생성.
  - `.github/workflows/deploy.yml` 배포 워크플로우에 `COMMIT_SHA` 환경변수 전달 및 배포 후 원격 API/Web의 커밋 SHA와 `github.event.workflow_run.head_sha` 100% 일치 검증 강제.
- [x] **P0: AGENTS.md 및 워크플로우 강제 규칙 최신화**
  - `package.json` 수정 시 락파일 갱신 필수 절차 및 `pnpm verify` 품질 게이트 명시.
- [x] **P1: 신규 타자 속도 테스트 (`games/typing-test`) 미니게임 플러그인 구현**
  - `pnpm generate:game typing-test` 스캔으로 이중 레지스트리 자동 갱신.
  - `games/typing-test/src/logic.ts` 순수 WPM, CPM, 정확도 계산 엔진 및 `test/typingLogic.test.ts` 단위 테스트 7종 구현 완료.
  - `games/typing-test/src/game.tsx` 키보드 반응형 타이핑 UI 및 실시간 WPM/CPM/정확도 연동 완료.
  - central web loader 또는 API route 수동 수정 없이 플러그인 이중 레지스트리 자동 연동 통과.

## 진행 중 (In Progress)

- [ ] Commit B 푸시 및 원격 GitHub Actions CI Green & Cloudflare Deploy Green (Provenance 통과) 확인.

## 남은 작업 (Remaining)

- [ ] 원격배포 100% 완료 검증 및 사용자 최종 보고.

## 알려진 문제 (Known Problems)

- 없음.

## 다음 작업 (Next Action)

- Commit B (`feat(games): add typing-test mini-game plugin with WPM scoring`) 커밋 및 푸시.

## 마지막 검증 상태 (Last Verified State)

- **Local Quality Gate (`pnpm verify`)**: PASS (13 workspace packages)
- **Local Frozen Lockfile**: PASS (`pnpm install --frozen-lockfile`)
- **Remote Commit A**: Pushed (`1144adc`)
- **Production API**: OK (`status: ok`)
- **Production Web**: OK (`200 OK`)
