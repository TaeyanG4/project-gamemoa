# GAMEMOA 프로덕션 외부 연동 운영 체크리스트 (PRODUCTION_INTEGRATIONS)

이 문서는 GAMEMOA 프로덕션 배포에 필요한 **외부 서비스 연동 설정값**을 한곳에 모은 운영자용 체크리스트입니다.
실제 값은 절대 기록하지 않으며, 각 항목은 GitHub Actions 위치·Cloudflare 반영 방법·검증 방법·현재 상태로만
구성됩니다. 상세 아키텍처/보안 정책은 각 도메인 문서(`docs/ADMIN_GUIDE.md`, `docs/CREATOR_SYSTEM.md`,
`docs/DISCORD_INTEGRATION.md`, `docs/DISCORD_BOT_GUIDE.md`)를 참고하세요.

> 이 문서에 "설정됨"이라고 적혀 있어도, 그것은 저장소 코드가 해당 값을 올바르게 사용할 준비가 되어
> 있다는 뜻일 뿐입니다. 실제 GitHub/Cloudflare에 값이 등록되어 있는지는 이 문서만으로 확정할 수
> 없으며, 매 배포 시 아래 검증 방법으로 직접 확인해야 합니다. 미확인 항목은 **외부 설정 대기**로
> 취급합니다.

## 1. Google 로그인 & 관리자 Google Step-Up

| 이름                    | 종류     | GitHub 위치 | 용도                                                                                                                                                                                      |
| ----------------------- | -------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`      | Variable | Variables   | Google Identity Services 로그인 및 관리자 step-up 공통 audience                                                                                                                           |
| `VITE_GOOGLE_CLIENT_ID` | Variable | Variables   | 웹 빌드에 주입되는 client ID (동일 값)                                                                                                                                                    |
| `ADMIN_GOOGLE_SUBS`     | Secret   | Secrets     | **(선택)** 관리자 step-up 추가 제한용 Google canonical `sub` 허용 목록(쉼표 구분). 미설정 시 "현재 GAMEMOA 계정에 연결된 Google 계정"이라는 1차 바인딩만으로 정상 동작합니다 — 필수 아님. |

검증: `GET /api/auth/providers`의 `google.configured`. `ADMIN_GOOGLE_SUBS`는 안전상 이유로 API가 노출하지
않으므로, `/admin`에서 실제 Google 계정으로 step-up을 시도해 성공 여부로만 확인합니다.

상태: 저장소 코드는 완전히 배선되어 있습니다. `GOOGLE_CLIENT_ID`/`VITE_GOOGLE_CLIENT_ID`는 프로덕션에
설정되어 있음을 확인했습니다(`gh variable list`). `ADMIN_GOOGLE_SUBS`는 선택 사항이며 미확인.

## 2. 관리자 인증 — 관리형 계정(D1) + root/break-glass

관리자 로그인은 이제 D1 `admin_accounts`(관리형 계정)가 주 경로이며, GitHub Secret 값은
"최초 관리자 bootstrap 자격"만 필요합니다. 자세한 모델은 `docs/ADMIN_GUIDE.md`를 참고하세요.

| 이름                    | 종류     | GitHub 위치 | 용도                                                                                                      |
| ----------------------- | -------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| `ADMIN_USER_IDS`        | Variable | Variables   | root/break-glass 자격(GAMEMOA 사용자 ID, 쉼표 구분). 최초 bootstrap에 필요, 이후 상시 유지되는 비상 경로. |
| `ADMIN_LOGIN_USERNAME`  | Variable | Variables   | **(Deprecated)** 레거시 관리자 아이디 — 관리형 계정이 하나도 없을 때만 폴백으로 사용됨.                   |
| `ADMIN_PASSWORD_PBKDF2` | Secret   | Secrets     | **(Deprecated)** 레거시 PBKDF2 레코드 — 위와 동일 조건에서만 폴백으로 사용됨.                             |

검증: `/admin`에서 실제 로그인 흐름을 통과해 대시보드가 열리는지 확인합니다. 자세한 절차는
`docs/ADMIN_GUIDE.md`를 참고하세요.

상태(2026-08-13 확인): `gh variable list`/`gh secret list`로 프로덕션을 직접 확인한 결과
`ADMIN_USER_IDS`가 **설정되어 있지 않아 관리자 bootstrap 자격이 아무에게도 없는 상태**였습니다 —
이것이 `/admin` 접근 불가의 근본 원인이었습니다. 운영자가 `ADMIN_USER_IDS`에 본인 사용자 ID를
등록하고 `/admin`에서 직접 bootstrap을 완료해야 합니다(**외부 설정 대기**). `ADMIN_LOGIN_USERNAME`/
`ADMIN_PASSWORD_PBKDF2`는 신규 배포에서 설정할 필요가 없습니다.

## 3. Creator Provider (YouTube / Twitch / CHZZK / SOOP)

| 이름                        | 종류     | GitHub 위치 |
| --------------------------- | -------- | ----------- |
| `YOUTUBE_CLIENT_ID`         | Variable | Variables   |
| `YOUTUBE_REDIRECT_URI`      | Variable | Variables   |
| `YOUTUBE_CLIENT_SECRET`     | Secret   | Secrets     |
| `YOUTUBE_API_KEY`           | Secret   | Secrets     |
| `TWITCH_CLIENT_ID`          | Variable | Variables   |
| `TWITCH_REDIRECT_URI`       | Variable | Variables   |
| `TWITCH_CLIENT_SECRET`      | Secret   | Secrets     |
| `CHZZK_CLIENT_ID`           | Variable | Variables   |
| `CHZZK_REDIRECT_URI`        | Variable | Variables   |
| `CHZZK_CLIENT_SECRET`       | Secret   | Secrets     |
| `SOOP_CLIENT_ID`            | Variable | Variables   |
| `SOOP_REDIRECT_URI`         | Variable | Variables   |
| `SOOP_CLIENT_SECRET`        | Secret   | Secrets     |
| `CREATOR_ENABLED_PROVIDERS` | Variable | Variables   | 이 배포에서 필수로 기대하는 provider 목록 (예: `YOUTUBE`). 미설정 시 전부 선택 사항 |

검증: `GET /api/creators/providers` (provider별 `configured` boolean). `pnpm smoke:prod --api-only`가
`CREATOR_ENABLED_PROVIDERS`에 선언된 provider의 `configured=false`를 배포 실패로 처리합니다.

상태: 저장소 코드/CI 배선은 완전합니다(`.github/workflows/deploy.yml`, `scripts/verify-production.ts`).
실제 값 존재 여부는 **외부 설정 대기**로 별도 확인. `USE_MOCK_CREATOR_PROVIDERS`는 어떤 배포 워크플로우에도
설정하지 않습니다.

## 4. Discord

Discord 연동(OAuth, HTTP Interactions, 명령어 등록, 설치 링크)의 설정값과 검증 방법은
`docs/DISCORD_INTEGRATION.md` §6, `docs/DISCORD_BOT_GUIDE.md` §6을 참고하세요. 명령어 자동 동기화/테스트
길드 도구가 추가되면 이 문서에도 반영합니다.

## 5. 공통 배포 검증

배포 후 다음을 순서대로 확인합니다.

1. GitHub Actions **CI** 워크플로우 GREEN
2. GitHub Actions **Deploy to Cloudflare** 워크플로우 GREEN
3. `GET /api/health`의 `commit`이 배포한 SHA와 일치
4. `GET /version.json`(Web)의 `commit`이 동일 SHA와 일치
5. `pnpm smoke:prod` GREEN (API/Web 라우트, Creator provider readiness 포함)

값을 등록/변경한 뒤에는 반드시 `main` 배포가 성공해야 Cloudflare Worker에 실제로 반영됩니다. 이 문서에
실제 시크릿 값을 절대 기록하지 않습니다.
