# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

사용자 맞춤화 및 계정 데이터 파운데이션 (Personalization & Account Data Foundation Sprint) 완수.

## 시작 상태

- **시작 커밋 (Starting SHA)**: `00d8ec784963a41ef253525f9a9c010c355c3fc6` (pushed & remote green verified)
- **Local Quality Gate (`pnpm verify`)**: 13/13 패키지 전원 PASS 통과
- **Production Status**: API `https://gamemoa-api.gamemoa.workers.dev/api/health` (`200 OK`), Web `https://gamemoa-web.gamemoa.workers.dev/` (`200 OK`)

---

## 완료 (Completed)

- [x] **P0: 세션 토큰 저장 보안 강화 (Session Token Hashing)**
  - 브라우저 쿠키에는 원시 세션 토큰을 발급하고, D1 데이터베이스 `sessions.id`에는 SHA-256 해시값만 저장하도록 강화 (`D1SessionRepository.ts`).
  - D1 데이터베이스 유출 시에도 프로덕션 실시간 세션 쿠키가 직접 노출되지 않도록 차단.
  - 기존 원시 세션 토큰 데이터베이스 행에 대해 투명한 이전 마이그레이션(backward-compatible legacy fallback) 및 단위 테스트 4종 작성.
- [x] **P1 & P2: Personalization 도메인, D1 마이그레이션 및 저장소 구축**
  - 신규 D1 마이그레이션 `0001_personalization.sql` 추가 (`user_favorites`, `user_recent_plays` 테이블).
  - `@gamemoa/core`에 `FavoriteItem`, `RecentPlayItem`, `PersonalizationRepository` 포트 인터페이스 및 `PersonalizationUseCases` 작성.
  - `GAME_MANIFEST_MAP` 매니페스트 기반 검증을 통해 게시 중인 정식 미니게임 ID만 저장/반환 보장 (삭제되거나 존재하지 않는 게임 ID 차단).
  - `D1PersonalizationRepository.ts` 구현 (인메모리 단위 테스트 및 회귀 테스트 완료).
- [x] **P3: API Contract 및 인증된 Personalization API 엔드포인트**
  - `@gamemoa/contracts`에 `PersonalizationStateSchema`, `ImportGuestPersonalizationRequestSchema`, `MutationResultSchema` Zod 계약 추가.
  - `apps/api/src/routes/personalization.ts` 구축 (`GET /api/personalization`, `POST /api/personalization/favorites/:gameId`, `DELETE /api/personalization/favorites/:gameId`, `POST /api/personalization/recent/:gameId`, `POST /api/personalization/import`).
  - 비인증 요청 시 401 Unauthenticated 반환 및 Hono DI 컨테이너 연동.
- [x] **P4: 프론트엔드 웹 Personalization 피처 & 게스트 로컬스토리지**
  - `apps/web/app/features/personalization/` 피처 모듈 구현 (`storage.ts`, `api.ts`, `PersonalizationContext.tsx`).
  - 게스트 버전 키 (`gamemoa.personalization.v1`) 기반 로컬스토리지 저장 및 JSON 파싱 안전성, 손상 데이터 방어 보장.
  - 로그인 시 게스트 로컬스토리지 상태를 서버 계정 상태와 단 1회 1-Way 통합(Import) 후 로컬스토리지 정리. 성공하기 전까지 게스트 데이터 보존.
  - 로그아웃 시 게스트 전용 상태로 안전 전환 및 계정 데이터 격리.
- [x] **P5: 게임 시작 시점 최근 플레이 자동 기록**
  - `game-slug.tsx` 플랫폼 게임 호스트에서 `runtime.emit({ type: "game_started" })` 이벤트 수신 시점에만 최근 플레이 기록 (`recordRecentPlay`). 단순 페이지 이동으로 기록되는 현상 방지.
- [x] **P6 & P7: GameCard 즐겨찾기 버튼, 카테고리 칩 및 홈 화면 맞춤 추천**
  - `GameCard.tsx`에 `<button>`과 `Link`의 부적절한 중첩 없이 1-클릭 즐겨찾기(북마크) 버튼 추가 (카드 이동 방지 `stopPropagation`).
  - `CategoryChips.tsx` "favorites" (즐겨찾기) 칩 필터링 구현 및 빈 상태 한국어 안내 문구("아직 즐겨찾기한 게임이 없습니다.") 분리.
  - `home.tsx` 스포트라이트 하단에 "최근 플레이" 및 "내 즐겨찾기" 맞춤 섹션 렌더링.
- [x] **P8: 새 세션 작업 원칙 명세화 및 한국어 문서 업데이트**
  - `docs/AGENTS.md`에 "새 세션 작업 원칙 (Fresh-Session Principles)" 항목 추가.
  - `README.md`, `docs/PROGRESS.md`, `docs/WORK_PROGRESS.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md` 한국어 현행화 완료.

---

## 블로커 / 프로덕션 상태 (Blockers & Production Status)

- **소셜 로그인 (Google / Discord)**:
  - **코드/서버 인프라**: ✅ 완료
  - **실제 프로덕션 인증**: ⚠️ 외부 Provider 설정 대기 (`BLOCKED — missing external provider configuration`).
  - 게스트 Personalization(로컬스토리지) 및 계정 Personalization 백엔드/API 단위 테스트 전원 통과 완료.

---

## 다음 작업 (Next Action)

- 품질 게이트 `pnpm verify` 실행 후 Git commit, `git push origin main` 및 `pnpm smoke:prod` 원격 배포 SHA 출처 검증 수행.

---

## 마지막 검증 상태 (Last Verified State)

- **Local Quality Gate (`pnpm verify`)**: PASS (13 workspace packages)
- **Local Unit Tests (`pnpm test`)**: PASS (27 workspace tasks)
- **Starting SHA**: `00d8ec784963a41ef253525f9a9c010c355c3fc6`
- **Production API**: OK (`status: ok`)
- **Production Web**: OK (`200 OK`)
