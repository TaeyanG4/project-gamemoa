# OwOGG Staging 운영 런북

OwOGG Staging은 Production과 완전히 분리된 배포 환경입니다. Worker, custom domain, D1, B2,
Google OAuth 앱, Discord 앱, Discord 전역 명령을 공유하지 않습니다. 설정이 없거나 대상을 확정할 수
없으면 배포가 실패하며 Production으로 폴백하지 않습니다.

> **현재 상태(2026-08-22 배포 전 확인)**: D1 `owogg-d1-staging`, B2
> `owogg-game-bundles-staging`, Staging Google OAuth, `OWOGG Staging` Discord Application,
> GitHub `staging` Environment, Cloudflare Access는 운영자가 이미 생성했습니다. 새로 만들지 않습니다.
> 세 custom domain은 첫 `custom_domain=true` Worker deploy가 연결하며 DNS를 수동 생성하지 않습니다.

## 0. 기본 개발 및 Production 승격 정책

OwOGG의 모든 일반 기능 개발, 버그 수정, DB migration, 인프라 변경은 Staging-first로 진행합니다.

```text
최신 staging 기준 작업 브랜치
  → 로컬 구현 및 pnpm verify
  → staging 대상 검토/병합
  → Staging CI/CD
  → stg.owogg.com 실제 접속 + API health + 배포 SHA 확인
  → Staging 배포 완료(테스트 가능)
  → 자동 smoke + 기능별 수동 acceptance test
  → Production 무변경 및 릴리스 증거 확인
  → 릴리스별 명시적 승인
  → 검증된 동일 tree를 main으로 승격
  → Production CI/CD + smoke/provenance 확인
```

- Production `main`은 개발 브랜치가 아니라 검증된 Staging 결과를 승격하는 릴리스 브랜치입니다.
- 로컬 테스트 성공만으로 Production에 배포하지 않습니다.
- Staging 검증 이후 코드, 설정, migration이 변경되면 다시 Staging부터 검증합니다.
- Production 승격은 매 릴리스마다 사용자의 명시적 승인이 필요합니다. 에이전트는 일반 구현 요청을
  `main` push, Production migration/deploy, secret 변경, Discord global sync 승인으로 해석하지 않습니다.
- merge 방식 때문에 commit SHA가 달라질 경우에도 Production tree는 승인된 Staging tree와 같아야
  하며, 실제 배포한 `main` SHA는 provenance smoke로 별도 확인합니다.
- 상태 보고는 `구현 완료(로컬 검증 완료)` → `Staging 배포 완료(테스트 가능)` →
  `Staging 검증 완료(Production 승격 대기)` → `Production 배포 완료`를 구분합니다.
- `Staging 배포 완료(테스트 가능)`는 workflow GREEN만으로 성립하지 않습니다. DNS/HTTPS, Access를 통한
  실제 Web 접속, API health, 대상 SHA provenance가 모두 확인되어야 합니다.

Staging에서 반드시 남길 릴리스 증거는 대상 commit SHA/tree, CI run, Deploy run, API/Web smoke,
변경 기능의 acceptance 결과, Production 리소스 무변경 확인입니다. DB migration은 Staging D1에 먼저
적용하고 forward/backward compatibility를 확인합니다. Codex·Claude의 강제 규칙은 루트
[`AGENTS.md`](../AGENTS.md)를 따릅니다.

## 1. 고정 대상

| 리소스      | Staging 대상                                      |
| ----------- | ------------------------------------------------- |
| Web Worker  | `owogg-web-staging` / `https://stg.owogg.com`     |
| API Worker  | `owogg-api-staging` / `https://api-stg.owogg.com` |
| Game origin | `https://play-stg.owogg.com`                      |
| D1          | `owogg-d1-staging`                                |
| B2          | `owogg-game-bundles-staging`                      |
| Google      | Staging 전용 OAuth client                         |
| Discord     | Staging 전용 application + test guild             |

`apps/api/wrangler.jsonc`의 Staging D1 ID는 일부러 사용할 수 없는 all-zero sentinel입니다. CI는
`STAGING_D1_DATABASE_ID`를 원격 D1 목록의 정확한 `owogg-d1-staging` 이름/UUID 쌍과 대조한 뒤,
gitignored CI 전용 `apps/api/wrangler.staging.generated.jsonc`를 만듭니다. 이후 모든 원격 D1 명령은
그 파일과 `--remote --env staging --x-provision=false --x-auto-create=false`를 함께 사용합니다.

Staging rate-limit namespace는 `91001`, `91002`이고 Production의 `1001`, `1002`와 다릅니다.
namespace ID는 Cloudflare 계정 전체 범위이므로 첫 배포 전에 `91001`, `91002`가 다른 Worker에서
사용되지 않는지 운영자가 확인해야 합니다.

## 2. GitHub Environment `staging`

Repository-level Production 값에 기대지 않습니다. 아래 항목은 GitHub의 `staging` Environment에
직접 등록합니다.

### Variables

| 이름                           | 값/조건                                                        |
| ------------------------------ | -------------------------------------------------------------- |
| `FRONTEND_URL`                 | `https://stg.owogg.com`                                        |
| `GAME_ORIGIN`                  | `https://play-stg.owogg.com`                                   |
| `GOOGLE_CLIENT_ID`             | Staging Google OAuth client ID                                 |
| `VITE_API_URL`                 | `https://api-stg.owogg.com`                                    |
| `VITE_GAME_ORIGIN`             | `https://play-stg.owogg.com`                                   |
| `VITE_GOOGLE_CLIENT_ID`        | `GOOGLE_CLIENT_ID`와 정확히 동일                               |
| `DISCORD_CLIENT_ID`            | Staging Discord application ID                                 |
| `DISCORD_COMMAND_SYNC_ENABLED` | 반드시 `false`                                                 |
| `DISCORD_INSTALL_URL`          | 위 `DISCORD_CLIENT_ID`를 쓰는 Discord HTTPS 설치 URL           |
| `DISCORD_PUBLIC_KEY`           | Staging Discord application의 64자리 hex public key            |
| `DISCORD_REDIRECT_URI`         | `https://api-stg.owogg.com/api/auth/discord/callback`          |
| `DISCORD_TEST_GUILD_ID`        | Staging 명령을 등록할 숫자 guild ID                            |
| `STAGING_D1_DATABASE_ID`       | 운영자가 확인한 `owogg-d1-staging` UUID                        |
| `STAGING_ADMIN_USER_IDS`       | 최초에는 빈 값, 로그인 후 확인한 Staging user ID를 쉼표로 구분 |
| `STAGING_WEB_SMOKE_ENABLED`    | Access service token 준비 전 `false`, 준비 후 `true`           |

### Secrets

| 이름                      | 용도/조건                                            |
| ------------------------- | ---------------------------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID`   | CI와 Worker/D1 조회·배포                             |
| `CLOUDFLARE_API_TOKEN`    | 필요한 Staging 리소스만 다루는 최소 권한 token       |
| `B2_BUCKET_NAME`          | 반드시 `owogg-game-bundles-staging`                  |
| `B2_ENDPOINT`             | Staging B2 S3 endpoint                               |
| `B2_REGION`               | Staging B2 region                                    |
| `B2_KEY_ID`               | Staging 버킷 범위 제한 key                           |
| `B2_APPLICATION_KEY`      | Staging 버킷 범위 제한 secret                        |
| `DISCORD_BOT_TOKEN`       | 테스트 guild 명령 등록용, Worker에는 업로드하지 않음 |
| `DISCORD_CLIENT_SECRET`   | API Worker runtime secret                            |
| `GAME_SESSION_SECRET`     | API Worker runtime secret                            |
| `CF_ACCESS_CLIENT_ID`     | Web smoke 활성화 시 필요한 Access service token      |
| `CF_ACCESS_CLIENT_SECRET` | Web smoke 활성화 시 필요한 Access service token      |

Staging workflow에 generic `ADMIN_USER_IDS`, Creator provider 설정, Repository-level Production
secret/variable을 추가하지 않습니다. `DISCORD_COMMAND_SYNC_ENABLED`는 항상 `false`이고 배포는
`discord:commands:register:guild`만 호출합니다.

## 3. 배포 흐름

`staging` push는 일반 CI를 먼저 실행합니다. pull request가 아닌 성공한 push만 reusable Staging
workflow를 호출하며 `owogg-staging` concurrency group으로 직렬화됩니다.

1. URL, OAuth/Discord pairing, B2 버킷, D1 UUID, Wrangler route, 빈 Cron, 필수 secret을 검증합니다.
2. Cloudflare custom-domain 할당을 읽기 전용으로 조회하고 충돌하면 DNS를 바꾸지 않고 실패합니다.
3. 원격 D1 target을 읽기 전용으로 확인하고 CI 전용 설정을 만든 뒤 migration을 적용합니다.
4. API Worker를 배포하고 runtime에 필요한 7개 secret만 업로드합니다.
5. API health/provenance를 확인하고 Staging D1/B2 target tuple로 공식 게임 번들을 발행합니다.
6. Web Worker를 빌드·배포합니다.
7. `STAGING_WEB_SMOKE_ENABLED=true`일 때만 Access service token으로 Web smoke를 실행합니다.
8. Discord 명령을 `DISCORD_TEST_GUILD_ID`에만 등록합니다.

1~8의 workflow가 성공했더라도 아래 실제 사용자 진입 조건을 모두 확인하기 전에는
`Staging 배포 완료`라고 보고하지 않습니다.

1. `stg.owogg.com`, `api-stg.owogg.com`, `play-stg.owogg.com` DNS가 기대한 Cloudflare 대상으로 해석됩니다.
2. 권한 있는 사용자가 Access를 통과해 `https://stg.owogg.com/`의 OwOGG 화면에 진입할 수 있습니다.
3. API health와 Web/API provenance가 배포 대상 Staging commit SHA와 일치합니다.
4. placeholder, DNS 오류, TLS 오류, redirect loop, 5xx 없이 브라우저에서 기능 테스트를 시작할 수 있습니다.

이 조건을 만족하면 **`Staging 배포 완료(테스트 가능)`**입니다. 로그인, 게임 실행, 점수 기록 등 변경
기능의 acceptance까지 끝난 상태는 별도로 **`Staging 검증 완료(Production 승격 대기)`**라고 보고합니다.

Production workflow와 Production resource는 배포 대상으로 사용하거나 수정하지 않습니다. domain
충돌 감지처럼 안전을 위해 필요한 read-only 조회만 허용합니다.

## 4. 로컬/CI 검증

외부 상태를 바꾸지 않는 기본 검증:

```bash
node --import tsx --test scripts/staging-contract.test.ts
pnpm --filter @owogg/api test
pnpm exec wrangler deploy --dry-run --env staging --config apps/api/wrangler.jsonc
pnpm exec wrangler deploy --dry-run --env staging --config apps/web/wrangler.jsonc
pnpm verify
```

`pnpm staging:preflight`는 §2의 Variables/Secrets가 환경변수로 주입된 CI용 전체 preflight입니다.
`pnpm d1:migrate:staging`은 검증 후 생성된 `apps/api/wrangler.staging.generated.jsonc`가 있어야 하며,
로컬에서 source config나 임의 UUID로 대신 실행하지 않습니다.

배포 후 smoke는 같은 검증기를 명시적 Staging URL로 실행합니다.

```bash
SMOKE_API_URL=https://api-stg.owogg.com pnpm smoke:prod --api-only
SMOKE_WEB_URL=https://stg.owogg.com pnpm smoke:prod --web-only
```

Access 보호 Web smoke에는 `CF_ACCESS_CLIENT_ID`와 `CF_ACCESS_CLIENT_SECRET`도 필요합니다.
명령 성공 뒤에도 일반 브라우저로 Access 로그인부터 OwOGG 화면 진입까지 확인해야 하며, 이 실제 접속
확인이 실패하면 `Staging 배포 완료`가 아닙니다.

## 5. 최초 배포 체크리스트

1. 이미 생성된 Cloudflare/B2/Google/Discord 전용 리소스와 §2의 GitHub Environment 값이 정확한지
   확인합니다. 같은 이름의 리소스를 새로 만들지 않습니다.
2. 첫 `staging` 배포가 성공하면 Discord Developer Portal의 Interactions Endpoint를
   `https://api-stg.owogg.com/api/discord/interactions`로 저장합니다.
3. Access를 거쳐 `stg.owogg.com`에 접속하고 Staging Google client로 로그인합니다.
4. 실제 Staging `user.id`를 확인해 `STAGING_ADMIN_USER_IDS`에 넣고 다시 배포한 뒤 관리자 bootstrap을
   수행합니다.
5. Google/Discord 로그인, 게임 실행/점수, D1 write, B2 publish/read를 확인합니다.
6. 같은 시간대의 Production D1/B2가 변하지 않았고 Production route가 그대로인지 확인합니다.

장애가 나면 실패한 단계의 target 이름과 URL부터 확인합니다. D1 sentinel을 실제 UUID로 commit하거나,
Production 설정으로 임시 우회하거나, Staging Discord 명령을 global sync하는 방식으로 복구하지
않습니다.
