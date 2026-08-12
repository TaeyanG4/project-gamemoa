# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

인증 및 랭킹 무결성 완수 (Authentication & Ranking Integrity Sprint)

## 시작 상태

- **시작 커밋 (Starting SHA)**: `1c687b98d1621303f8f7dcad48b3866d51462cad` (origin/main pushed & verified)
- **Local Quality Gate (`pnpm verify`)**: 13/13 패키지 전원 PASS 통과
- **Production Status**: API `https://gamemoa-api.gamemoa.workers.dev/api/health` (`200 OK`), Web `https://gamemoa-web.gamemoa.workers.dev/` (`200 OK`)

---

## 블로커 / 현주소 (Blockers & Current Reality)

1. **게스트 랭킹 데이터베이스 저장 버그 (P0)**:
   - 비인증 플레이어가 `POST /api/scores`를 호출하여 D1 `scores` 테이블에 `user_id IS NULL` 상태로 점수를 기록할 수 있는 결함 존재.
2. **소셜 로그인 실제 프로덕션 적용 (P2)**:
   - **Google / Discord 로그인**: 백엔드 OAuth 코드 구현되어 있으나 프로덕션 환경 변수/시크릿 미주입으로 `configured: false` 상태.

---

## 진행 중인 스프린트 (Current Sprint)

- [ ] **P0: Score API 인증 강제 & 계정 식별자 바인딩**
  - `POST /api/scores`에 유효한 `gamemoa_session` 쿠키 필수화 (미인증 시 401 Unauthorized 반환).
  - 클라이언트 닉네임 변조 차단 및 세션 사용자 식별자(`user_id`, `nickname`, `avatar_url`)만 랭킹에 바인딩.
- [ ] **P0: 도메인 & 저장소 타입 및 쿼리 방어**
  - `@gamemoa/core` `Score` 및 `ScoreRepository` interface에서 `userId` 필수화 (`number`).
  - `D1ScoreRepository`에서 `user_id IS NOT NULL` 조건 추가로 레거시 게스트 기록 랭킹 노출 차단.
- [ ] **P0: D1 마이그레이션 `0002_score_auth_integrity.sql` 구축**
  - 기존 `user_id IS NULL` 레거시 게스트 점수 행 안전 제거.
  - SQLite Trigger를 통한 `user_id IS NULL` 저장 차단 가드 구축.
- [ ] **P1: 프론트엔드 게스트 점수 서버 제출 차단 & 시도 시점 자격 캡처**
  - 게임 시작 시점의 인증 상태로 랭킹 참여 자격(`rankingEligible`) 결정.
  - 게스트 완료 결과 UI에 "게스트 기록은 이 기기에만 저장됩니다." 한국어 안내 및 서버 POST 차단.
- [ ] **P2: 소셜 로그인 프로덕션 배포 파이프라인 & 단일 출처 (Single Source of Truth) 정립**
  - `GET /api/auth/providers`에서 공개 `google.clientId` 반환하도록 단일 출처화.
  - `.github/workflows/deploy.yml` 배포 파이프라인 환경변수 전달 보장.
  - `pnpm auth:prod:check` 검증기 구축.

---

## 다음 작업 (Next Action)

- P0 / P1 / P2 스택 코드 수정, 마이그레이션 적용 및 `pnpm verify` 품질 게이트 검증.

---

## 마지막 검증 상태 (Last Verified State)

- **Local Quality Gate (`pnpm verify`)**: PASS (13 workspace packages)
- **Local Unit Tests (`pnpm test`)**: PASS (27 workspace tasks)
- **Starting SHA**: `00d8ec784963a41ef253525f9a9c010c355c3fc6`
- **Production API**: OK (`status: ok`)
- **Production Web**: OK (`200 OK`)
