# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

제품 무결성 및 게임 세션 UX (Product Integrity & Game Session UX) 스프린트 완수.

## 시작 상태

- **시작 커밋 (Starting SHA)**: `dea1f740e5b0fcb358c573898f7c3bfd23a8b983` (Pushed & Remote Green Verified)
- **Local Quality Gate (`pnpm verify`)**: 13/13 패키지 전원 PASS 통과
- **Production Status**: API `https://gamemoa-api.gamemoa.workers.dev/api/health` (`200 OK`), Web `https://gamemoa-web.gamemoa.workers.dev/` (`200 OK`)

## 완료 (Completed)

- [x] **P1: 프로덕션 가짜 목 랭킹 데이터 제거 및 명시적 랭킹 상태 구현**
  - `apps/web/app/features/scores/api.ts` 및 `apps/web/app/routes/ranking.tsx`에서 `MOCK_LEADERBOARD` 조용한 대체 로직 완벽 제거.
  - 랭킹 UI에 `loading` (로딩 스켈레톤), `success-with-data` (랭킹 테이블), `success-empty` (안내 문구), `error` (에러 메시지 + 다시 시도 버튼) 4가지 상태 분리 적용.
  - 테스트용 목 데이터는 `test/fixtures/leaderboard.ts` 격리 위치로 이동.
- [x] **P2: 계약 기반 단일 Web API 클라이언트 파운데이션 구축 (`apps/web/app/lib/api`)**
  - `config.ts`, `errors.ts` (`ApiClientError`), `client.ts` (`apiFetch`) 단일 모듈 구조 도입.
  - API base URL 해정 로직 단일화 (`VITE_API_URL` -> `localhost` -> Workers 도메인).
  - `@gamemoa/contracts`의 Zod 스키마 (`AuthMeResponseSchema`, `LeaderboardResponseSchema`, `SubmitScoreResponseSchema`, `PersonalBestResponseSchema`)를 수신 단에서 Runtime validation으로 강제 및 타입 단언 제거.
- [x] **P2: 점수 제출 UX 시각화 및 프로필 데이터 정합성 강화**
  - 점수 제출 상태 (`submitting`, `success`, `error`) UI 시각화 및 네트워크 실패 시 게임 재플레이 없이 점수 재제출 버튼 제공.
  - `apps/web/app/routes/profile.tsx`에서 '계정 최고 기록' (Server Best)과 '기기 최고 기록' (Local Best)을 명확하게 분리 표시.
- [x] **P3: 독립적인 게임 시도 라이프사이클 (Game Attempt Lifecycle)**
  - `game-slug.tsx` 게임 실행 호스트에서 게임 시도마다 고유 `sessionId` (`crypto.randomUUID()`) 부여 및 `attemptKey` 증가를 통한 컴포넌트 완전 재마운트 구현.
  - 게임 "다시 하기" 시 이전 잔여 상태나 타이머 없이 완전히 깨끗한 새 시도 생성 검증.
- [x] **P4: 인증된 GameRuntimeContext 및 `requiresAuth` 접근 제어**
  - `GameRuntimeContext.user`에 플랫폼 `AuthContext` 유저 연동 (`id`, `nickname`).
  - `manifest.requiresAuth === true` 일 때 비로그인 사용자의 게임 진행을 차단하고 로그인 유도 안내 화면 렌더링.
  - 생산용 콘솔 로깅 노이즈 제거.
- [x] **P5: 매니페스트 기반 카테고리 필터링 & 스포트라이트 명시적 선택**
  - Home 및 Games 페이지의 카테고리 필터링을 `manifest.categories` 기반으로 일원화하여 슬러그 문자열 검사 해킹 제거.
  - 매니페스트 카테고리 어휘 정규화 (`popular`, `reaction`, `brain`, `aim`, `typing`, `arcade`).
  - Home 스포트라이트 게임을 레지스트리 자동 정렬 순서 의존이 아닌 명시적 큐레이션 규칙으로 분리.
- [x] **P6: 타자속도 테스트 60초 연속 측정 세맨틱 구현**
  - 60초 동안 문장이 완료되면 자동으로 다음 문장이 공급되며 누적 통계 (`correctChars`, `incorrectChars`, `totalTypedChars`)를 보존.
  - 60초 타이머 만료 시에만 테스트가 마감되고 최종 WPM/CPM/정확도 계산.
  - 타자속도 테스트 내부 중복 모달 제거 및 플랫폼 게임 호스트 결과 오버레이로 UX 이관.
  - 메타데이터 표시 시 사용자 친화적 한국어 라벨ing (WPM, CPM, 정확도, 정타, 오타) 적용.
- [x] **P7 & P8: 계약 표준화 및 웹 단위 테스트 추가**
  - `apps/web/app/test/webApiAndGameUX.test.ts` 추가 (LeaderRecordSchema 변환, empty/real response 검증, manifest 카테고리 필터링, 60초 연속 타자 통계 계산).
  - `pnpm test` 전원 GREEN 통과.
- [x] **P10: 한국어 문서 최신화**
  - `README.md`, `docs/PROGRESS.md`, `docs/WORK_PROGRESS.md`, `docs/ROADMAP.md` 현행화 완료.

## 진행 중 (In Progress)

- [ ] 품질 게이트 (`pnpm verify`) 최종 확인, git commit, main 푸시 및 원격 GitHub Actions CI & Cloudflare Deploy Green & Provenance 통과 검증.

## 남은 작업 (Remaining)

- [ ] 원격 배포 100% 완료 검증 및 사용자 보고.

## 알려진 문제 (Known Problems)

- 없음.

## 다음 작업 (Next Action)

- `pnpm verify` 실행 후 Git Commit & Push 및 원격 SHA Provenance 검증.

## 마지막 검증 상태 (Last Verified State)

- **Local Quality Gate (`pnpm verify`)**: PASS (13 workspace packages)
- **Local Unit Tests (`pnpm test`)**: PASS (22 workspace tasks)
- **Starting SHA**: `dea1f740e5b0fcb358c573898f7c3bfd23a8b983`
- **Production API**: OK (`status: ok`)
- **Production Web**: OK (`200 OK`)
