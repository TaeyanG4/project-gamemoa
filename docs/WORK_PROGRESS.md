# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

# 현재 목표

계정 식별/통합 & 즐겨찾기 접근통제 & OAuth 보안 & 브랜드 파비콘 스프린트 완수

## 시작 상태

- **시작 커밋 (Starting SHA)**: `053f16d86320db4d020141ac7986ad94fb88d041` (origin/main)
- **Local Quality Gate (`pnpm verify`)**: PASS (13 패키지)
- **Production Status**: API `https://gamemoa-api.gamemoa.workers.dev/api/health` (`200 OK`), Web `https://gamemoa-web.gamemoa.workers.dev/` (`200 OK`)

---

## 완료

- [x] **P0: 게스트 즐겨찾기 로그인 전용화 & 스토리지 마이그레이션** — 게스트 즐겨찾기 클릭/카테고리 칩 → 로그인 모달, 로컬 미저장. v1→v2 마이그레이션(즐겨찾기 폐기, 최근 플레이 보존). 게스트 임포트 `guestFavorites` 제거.
- [x] **P2: Google ID Token 검증 강화** — `tokeninfo` → Google OpenID JWKS 로컬 RS256 JWT 검증(iss/aud/exp/sub). JWKS 캐싱. 모의 JWKS/RSA 서명 테스트 매트릭스.
- [x] **P1: OAuth 공급자 연결** — `IdentityUseCases` + `UserRepository` 연결 역량, 마이그레이션 `0003`(UNIQUE(user_id, provider)), 연결/연결해제 API, LOGIN/LINK 명시 분리, `ACCOUNT_ALREADY_LINKED`/`LAST_AUTH_PROVIDER` 처리.
- [x] **P1: Primary Account Wins 계정 통합** — 마이그레이션 `0004`(`account_merge_challenges`), `AccountMergeUseCases`(소유 증명/챌린지/동일 프로바이더 충돌 가드), D1 `batch` 원자 트랜잭션. 유지/폐기 방향 모두 지원, 실패 시 원자 롤백 테스트.
- [x] **P4: 프로필 계정 관리 UX** — "연결된 로그인 계정" 섹션, `MergeModal`(안전 요약/Primary 선택/삭제 경고/확정), 연결 충돌 시 통합 제안.
- [x] **P3: GAMEMOA 브랜드 파비콘** — 캐노니컬 `favicon.svg`(4-타일 게임 허브 마크), 결정론적 `scripts/generate-favicon.ts`(의존성 없는 PNG/ICO 인코더), SPA 셸 파비콘 링크 주입, `site.webmanifest`, 프로덕션 자산 200 검증.
- [x] **한국어 문서 업데이트** — README/ARCHITECTURE/PROGRESS/WORK_PROGRESS/ROADMAP/oauth-setup 런북 업데이트, `docs/runbooks/account-linking.md` 신규 작성.

---

## 진행 중

- 없음 (스프린트 구현 및 운영 검증 완료).

---

## 남은 작업

- 없음.

---

## 블로커

- 없음 (로컬 품질 게이트, 단위 테스트, GitHub CI, Cloudflare Deploy 및 운영 Provenance/Smoke 전원 PASS).

---

## 다음 작업 (Next Action)

- **Discord Integration Foundation Sprint** — Discord App → HTTP Interactions → Hono Worker → GAMEMOA 애플리케이션 서비스 → D1 (Gateway 없이). 명령어 후보: `/gamemoa link`, `/gamemoa profile`, `/gamemoa ranking`, `/gamemoa server-ranking`, `/gamemoa games`. 서버 랭킹은 "해당 Discord 서버에서 GAMEMOA와 연결된 사용자들의 랭킹"으로 제한.

---

## 마지막 검증 상태 (Last Verified State)

- **Local Quality Gate (`pnpm verify`)**: PASS (format/arch/registry/lint/typecheck/test/build)
- **Local Unit Tests**: core 25 / api 28 / db 4 / web 10 / games — 전원 PASS
- **D1 마이그레이션 (로컬 + 프로덕션)**: 0003 / 0004 적용 성공
- **GitHub Actions CI**: GREEN (최종 origin/main HEAD 기준)
- **Cloudflare Deploy**: GREEN (API/Web Worker 배포 성공)
- **운영 Provenance/Smoke**: `/api/health` commit 및 Web `/version.json` commit = 최종 origin/main HEAD 일치; 홈/게임/랭킹/프로필/미니게임 및 favicon 자산(/favicon.svg, /favicon.ico, /apple-touch-icon.png, /favicon-192x192.png, /site.webmanifest) HTTP 200
- **시작 SHA**: `053f16d86320db4d020141ac7986ad94fb88d041`
