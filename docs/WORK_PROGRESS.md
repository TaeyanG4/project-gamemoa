# GAMEMOA 작업 진행 현황 (WORK_PROGRESS)

## 시작 상태 (Starting State)

- Commit SHA: `00b50616fd21ded994a9017a733a79be32db7477`
- Local Status: `pnpm-lock.yaml` 불일치 수정 완료 (`pnpm install --frozen-lockfile` 성공)
- GitHub CI Status: RED (이전 00b5061 커밋 시 pnpm-lock.yaml 미갱신으로 인한 CI 실패)
- Cloudflare Deploy Status: SKIPPED (CI 실패로 인해 배포 자동 건너뜀)
- Production Status: API `https://gamemoa-api.gamemoa.workers.dev/api/health` (`200 OK`), Web `https://gamemoa-web.gamemoa.workers.dev/` (`200 OK`)

## 완료된 작업 (Completed)

- [x] P0: `pnpm-lock.yaml` 갱신 및 `pnpm install --frozen-lockfile` 검증 완료
- [x] 게임 플러그인 아키텍처 (매니페스트 및 웹 로더 자동 레지스트리 생성)
- [x] Core 및 D1 Persistence 레이어 분리 (D1ScoreRepository에서 GAME_MANIFEST_MAP 제거)
- [x] @gamemoa/contracts API Contract 단일 소스 통합
- [x] Application Layer (`ScoreUseCases`) 도입 및 API Composition Root 적용
- [x] Aim Test 반응형 아레나 및 순수 로직 단위 테스트 분리
- [x] API Origin / CSRF 보안 가드 적용

## 진행 중인 작업 (In Progress)

- [ ] P0-P3: Remote GitHub CI/CD Green 복구 (pnpm-lock.yaml 푸시 및 원격 CI/Deploy 검증)
- [ ] Game Plugin Regression Test 강화 (games/* == manifest registry == web loader registry 검증)
- [ ] OAuth 인프라 레이어 분리 (`apps/api/src/infrastructure/oauth/`)
- [ ] Zod API 응답 계약 검증 및 API JSON camelCase 표준화 문서화
- [ ] 문서 전체 한국어 본문 최신화 (README, PROGRESS, BLUEPRINT, ARCHITECTURE, AGENTS, ROADMAP)

## 남은 작업 (Remaining)

- [ ] 원격 GitHub CI 성공 확인
- [ ] 원격 Cloudflare Deploy 성공 확인
- [ ] Production API 및 Web 스모크 테스트 수행

## 알려진 문제 (Known Problems)

- 00b5061 커밋에서 `apps/web/package.json`의 Wrangler 버전을 `^4.121.0`으로 변경했으나 `pnpm-lock.yaml`을 갱신하여 푸시하지 않아 원격 GitHub Actions CI가 RED 상태였음 (로컬에서 lockfile 갱신 완료, 푸시 대기 중).

## 다음 작업 (Next Action)

- 로컬 품질 게이트 전수 검증 (`format:check`, `lint`, `architecture:check`, `registry:check`, `typecheck`, `test`, `build`) 후 git commit & push 수행하여 원격 CI 및 Deploy Green 복구.

## 마지막 원격 검증 (Last Verified Remote State)

- Commit SHA: `00b50616fd21ded994a9017a733a79be32db7477`
- GitHub CI: RED (lockfile mismatch)
- Cloudflare Deploy: SKIPPED
- Production API: OK (`status: ok`)
- Production Web: OK (`200 OK`)
