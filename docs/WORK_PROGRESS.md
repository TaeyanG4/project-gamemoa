# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

인증 및 랭킹 무결성 완수 (Authentication & Ranking Integrity Sprint)

## 시작 상태

- **시작 커밋 (Starting SHA)**: `1c687b98d1621303f8f7dcad48b3866d51462cad` (origin/main pushed & verified)
- **Local Quality Gate (`pnpm verify`)**: 13/13 패키지 전원 PASS 통과
- **Production Status**: API `https://gamemoa-api.gamemoa.workers.dev/api/health` (`200 OK`), Web `https://gamemoa-web.gamemoa.workers.dev/` (`200 OK`)

---

## 완료 및 프로덕션 검증 (Completed & Production Verified)

- [x] **P0: Score API 인증 강제 & 계정 식별자 바인딩**
  - `POST /api/scores`에 유효한 `gamemoa_session` 쿠키 필수화 (미인증 제출 시 401 Unauthorized 반환).
  - 클라이언트 닉네임 변조를 차단하고 세션 유저 식별자(`user_id`, `nickname`, `avatar_url`)만 랭킹에 바인딩.
- [x] **P0: 도메인 & 저장소 타입 및 쿼리 방어**
  - `@gamemoa/core` `Score` 엔티티 및 `ScoreRepository` 인터페이스의 `userId` 필수화 (`number`).
  - `D1ScoreRepository`에서 `user_id IS NOT NULL` 조건 추가로 레거시 게스트 기록 랭킹 노출 전면 차단.
- [x] **P0: D1 마이그레이션 `0002_score_auth_integrity.sql` 적용**
  - 프로덕션 D1 레거시 `user_id IS NULL` 게스트 점수 행 안전 제거.
  - SQLite Trigger를 통한 `user_id IS NULL` 저장 차단 가드 구축.
- [x] **P1: 프론트엔드 게스트 점수 서버 제출 차단 & 시도 시점 자격 캡처**
  - 게임 시작 시점의 인증 상태로 랭킹 참여 자격(`rankingEligible`) 결정.
  - 게스트 완료 결과 UI에 "게스트 기록은 이 기기에만 저장됩니다." 한국어 안내 및 로그인 버튼 렌더링.
- [x] **P2: 소셜 로그인 실제 프로덕션 설정 & 단일 출처 (Single Source of Truth) 완료**
  - Google OAuth Web Client ID 및 Discord OAuth Application 자격 증명을 GitHub Variables / Secrets에 등록.
  - `GET /api/auth/providers` 프로덕션 진단 결과 `google.configured: true`, `discord.configured: true` 최종 통과 (`pnpm auth:prod:check` GREEN).
  - `deploy.yml` 배포 파이프라인 연동 및 프로덕션 배포 출처 Provenance 일치 확인.

---

## 블로커 / 프로덕션 현황 (Blockers & Production Status)

- **게스트 랭킹 버그**: ✅ 수정 완료 및 D1 마이그레이션 적용 완료 (`user_id IS NOT NULL` 강제)
- **Google 소셜 로그인**: ✅ 프로덕션 활성화 완료 (`configured: true`, Client ID 정상 서빙)
- **Discord 소셜 로그인**: ✅ 프로덕션 활성화 완료 (`configured: true`, OAuth2 Callback & State validation 준비 완료)
- **Local / Remote Quality Gate**: `pnpm verify` & `pnpm smoke:prod` 100% PASS

---

## 다음 작업 (Next Action)

- 계정 프로필 UX polish 및 맞춤화 기능(Personalization) 동기화 고도화 또는 신규 미니게임 확장.

---

## 마지막 검증 상태 (Last Verified State)

- **Local Quality Gate (`pnpm verify`)**: PASS (13 workspace packages)
- **Local Unit Tests (`pnpm test`)**: PASS (27 workspace tasks)
- **Starting SHA**: `00d8ec784963a41ef253525f9a9c010c355c3fc6`
- **Production API**: OK (`status: ok`)
- **Production Web**: OK (`200 OK`)
