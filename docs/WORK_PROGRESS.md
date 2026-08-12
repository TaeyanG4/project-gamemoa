# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

크리티컬 버그 수정 및 게임 플레이 UX 안정화 (Critical Bug Fix & Gameplay UX Stabilization Sprint) 완수.

## 시작 상태

- **시작 커밋 (Starting SHA)**: `5744415fb745ee54a9b8028a1105909235cb115f` (pushed & remote green verified)
- **Local Quality Gate (`pnpm verify`)**: 13/13 패키지 전원 PASS 통과
- **Production Status**: API `https://gamemoa-api.gamemoa.workers.dev/api/health` (`200 OK`), Web `https://gamemoa-web.gamemoa.workers.dev/` (`200 OK`)

---

## 완료 (Completed)

- [x] **P0: 프로덕션 무한 대기 (Hang) 방지 및 재사용 가능한 검증 검사기 구축 (`scripts/verify-production.ts`)**
  - 개별 HTTP 요청 타임아웃 (`AbortSignal.timeout`), 최대 시도 횟수 (20회 x 3초), 전체 절대 벽시계 하드 타임아웃 (90초)을 적용한 `pnpm smoke:prod` 스크립트 작성.
  - 무한 대기, 타이머 누수, 오픈 핸들을 방지하고 성공 시 exit code 0, 실패/타임아웃 시 exit code 1로 즉시 프로세스 종료.
  - GitHub Actions `deploy.yml`의 인라인 임시 node -e 블록을 `pnpm smoke:prod`로 리팩토링.
- [x] **P1: 소셜 로그인 안전 진단 및 서버 인프라/UI 예외 방지**
  - 안전한 서버 진단 엔드포인트 `GET /api/auth/providers` 구축 (비밀키/비밀번호/토큰 절대 미노출).
  - 프론트엔드 빌드 환경 변수 (`VITE_GOOGLE_CLIENT_ID`, `VITE_API_URL`) 파이프라인 명시적 연결.
  - `LoginModal.tsx` 및 `AuthContext.tsx`에서 서버 및 빌드 구성 미설정 시 한국어 안내 메시지("Google/Discord 로그인이 아직 설정되지 않았습니다.")와 함께 비활성화 처리하여 500 오류 및 앱 크래시 차단.
  - 상세한 한국어 소셜 로그인 설정 런북 (`docs/runbooks/oauth-setup.md`) 작성.
- [x] **P2: 미니게임 썸네일 복원 및 CI 레지스트리 검증 강화**
  - `aim-test` 및 `typing-test` 게임의 경량 SVG 썸네일 자산 생성 및 `apps/web/public/games/` 및 각 플러그인 위치에 배치.
  - `scripts/check-registry.ts` (`registry:check`)에 `status === "published"`인 모든 게임의 썸네일 파일 존재 여부를 자동 검증하는 CI 이단 안전 장치 구축.
  - `GameCard.tsx`에 `onError` 런타임 렌더링 Fallback UI 추가하여 썸네일 로드 실패 시에도 브라우저 엑스박스가 뜨지 않고 가공된 이니셜 뱃지가 표시되도록 보장.
- [x] **P3: 순서 기억력 (Memory Test) 버그 수정 및 Runtime 연동**
  - 패드 내부의 불필요한 시각 텍스트(`RED`, `GREEN`, `BLUE`, `YELLOW`) 제거 (접근성 `aria-label` 유지).
  - 센터 뷰/외부 영역/관찰 상태/헤더 클릭 시 임의로 게임 오버가 발생하던 오인 클릭 실패 버그 완벽 차단.
  - `GameProps` 및 `runtime` 연동 (`runtime.emit({ type: "game_started" })`, `runtime.emit({ type: "game_completed" })`).
  - 점수 정의를 '달성 완료된 시퀀스 레벨 수'(`level - 1`)로 명확히 고정하고 시도당 `runtime.complete`가 단 1회만 호출되도록 보장.
- [x] **P4: 타자 속도 (Typing Test) 공백 유지 및 실제 입력 오타 UI 개선**
  - `white-space: pre-wrap` 및 `\u00A0` 렌더링 기법을 적용하여 "The quick brown fox"와 같은 문장의 단어 간격 공백이 명확히 보이도록 수정.
  - 오타 입력 시 목표 글자를 빨간색으로 바꾸는 것이 아니라, 사용자가 실제 입력한 오타 글자 (예: `e` 대신 `r` 입력 시 `r`)를 빨간색으로 시각화하고 기대 문자 유도 힌트 제공.
  - 백스페이스(Backspace) 수정 및 60초 연속 테스트 누적 WPM 통계 유지.
- [x] **P5: 게임 화면 크기 (Game Viewport) 확대 및 반응형 최적화**
  - `game-slug.tsx` 플랫폼 게임 호스트 컨테이너 max-width를 `max-w-4xl`에서 `max-w-6xl`로 확장하여 데스크톱 1920x1080 및 1366x768 환경에서 화면 너비의 75~90%를 효율적으로 활용하도록 개선.
  - Reaction Time, Aim Test, Memory Test, Typing Test의 개별 반응 영역과 판 면적을 데스크톱 공간에 맞게 크게 확대.
  - Mobile (390x844) 환경에서 반응형 비율을 유지하여 가로 스크롤 및 요소 잘림 현상 방지.
- [x] **P6 & P8: 단위/회귀 테스트 및 품질 게이트 통과**
  - API, Web, Memory Test, Typing Test 단위 회귀 테스트 추가 및 통과.
  - `pnpm verify` (13개 워크스페이스 패키지 빌드, 린트, 타입체크, 테스트 전원 Pass).

---

## 알려진 블로커 / 진행 현황 (Known Blockers / Status)

- **소셜 로그인 (Google / Discord)**:
  - **코드 구현**: 완료 (엔드포인트, Zod 검증, 한국어 Fallback UI, 런북 작성).
  - **외부 블로커**: 구글 개발자 콘솔(Google Cloud Console) 및 디스코드 개발자 포털(Discord Developer Portal)의 승인된 원본/콜백 URI 및 Client Secret이 외부 콘솔 설정 전이므로, 실제 계정 인증 테스트는 수동 콘솔 설정 후 진행 가능 (`BLOCKED — missing external provider configuration`).

---

## 마지막 검증 상태 (Last Verified State)

- **Local Quality Gate (`pnpm verify`)**: PASS (13 workspace packages)
- **Production Smoke Verification (`pnpm smoke:prod`)**: PASS (8초 이내 완결)
- **Local Unit Tests (`pnpm test`)**: PASS (22 workspace tasks)
- **Starting SHA**: `5744415fb745ee54a9b8028a1105909235cb115f`
- **Production API**: OK (`status: ok`)
- **Production Web**: OK (`200 OK`)
