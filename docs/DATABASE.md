# OwOGG 데이터베이스

상태: 기준 문서

마지막 검증: 2026-08-21

최신 마이그레이션: `0033_generic_game_assets.sql`

기준 소스:

- `packages/db/migrations/`
- `packages/db/src/d1/`
- `packages/db/src/storage/`
- `apps/api/src/container.ts`
- `.github/workflows/deploy.yml`

Cloudflare D1의 실제 schema와 제약조건은 migration 파일이 유일한 권한 원천입니다. 이 문서는
현재 `0000_initial_schema.sql`부터 `0033_generic_game_assets.sql`까지의 역할을 설명합니다.

## 마이그레이션 범위

| 범위          | 주제                                                                     |
| ------------- | ------------------------------------------------------------------------ |
| `0000`–`0005` | 사용자, 점수, identity/merge, progression                                |
| `0006`–`0009` | Discord link, guild, guild XP                                            |
| `0010`–`0014` | creator profile, metrics, review                                         |
| `0015`–`0018` | admin 인증/계정, locale, 활동 연속 기록                                  |
| `0019`–`0023` | 게임 설정, 난이도 점수, 프로필 공개 범위, 모니터링, moderation           |
| `0024`–`0028` | USER sandbox game, staff/program, soft delete, mode/logo, 일회성 attempt |
| `0029`        | generic `games` identity와 USER backfill                                 |
| `0030`        | USER identity write convergence                                          |
| `0031`        | 공통 `game_versions`, slug/live-version 불변식, version 수렴             |
| `0032`        | generic score acceptance에 필요한 relational binding                     |
| `0033`        | generic `game_assets`, USER logo convergence                             |

기존 migration은 변경, squash, 삭제하지 않습니다. 프로덕션 배포는 API보다 먼저
`pnpm d1:migrate:prod`를 실행합니다.

## 접근 경계

```text
Hono route
→ packages/core use case / port
→ packages/db D1 repository
→ D1
```

route에서 SQL을 직접 실행하는 것이 기본 구조가 아닙니다. 읽기 일관성, transaction/batch, row
mapping은 repository가 담당합니다. B2 canonical/bundle은 D1 row와 별도 저장소이지만 core의
port를 통해 조합됩니다.

## 공통 Game Platform 테이블

### `games`

Generic game identity의 권한 원천입니다.

- 숫자 `id`와 유일한 `slug`
- `publisher_type = OWOGG | USER`
- USER publisher의 relational `publisher_user_id`
- visibility와 soft-deletion 상태
- 현재 `live_version_id`

DB trigger는 live version이 같은 game의 `game_versions` row를 가리키도록 강제합니다. OWOGG
publisher authority는 서버/배포 과정이 기록하는 relational fact이며 이름이나 slug로 추론하지
않습니다.

### `game_versions`

Publisher-neutral bundle identity와 publication 사실을 저장합니다.

- `id`, `game_id`, source/object identity, `content_hash`, bundle bytes
- `UPLOADED | PUBLISHING | READY | FAILED`
- publication된 manifest key, 크기, 파일 수, timestamp/error

불변 publication target은 `(gameId, versionId, contentHash)`입니다. `READY`만 runtime 제공 후보가
되며 live pointer, visibility, kill switch, canonical/manifest validation도 모두 통과해야 합니다.

### `game_assets`

게임 단위 provider-neutral 자산 메타데이터입니다. 현재 `LOGO`가 사용되며 object bytes는 B2에
있습니다. 자산은 game 단위이고 version bundle과 분리됩니다.

## USER 제어 영역 테이블

### `sandbox_games`

USER upload/review workflow의 제어 데이터입니다.

- developer user ownership
- review slot과 editable metadata
- visibility, live version compatibility fields
- `logo_key` compatibility write surface
- soft-delete timestamp

### `sandbox_game_versions`

USER 버전의 심사와 원본 upload 정보를 저장합니다.

- review status: `PENDING_REVIEW | APPROVED | REJECTED | WITHDRAWN`
- reviewer, reject/revoke 사유, audit 관계
- source archive와 publication compatibility fields

USER version은 generic `game_versions`와 같은 숫자 ID를 공유합니다. `0029`–`0033`의 backfill과
trigger는 기존/현재 USER write를 generic tables로 수렴시킵니다. control plane row를 runtime이
직접 권한 원천으로 사용하는 구조는 아닙니다.

## 두 개의 독립 상태축

```text
Publication axis: UPLOADED → PUBLISHING → READY | FAILED
Review axis:      PENDING_REVIEW → APPROVED | REJECTED | WITHDRAWN
```

`READY`는 bundle의 파일과 manifest가 완전히 publication되었다는 뜻입니다. `APPROVED`는 관리자가
USER 버전을 검토했다는 뜻입니다. 승인 시점에 version은 이미 `READY`여야 하지만 그 역은
성립하지 않습니다.

```text
READY != APPROVED
```

실패한 publication은 같은 numeric version과 source archive를 사용해 republish할 수 있습니다.
검토 결정과 publication failure는 별도입니다.

## `0033` logo 수렴은 현재 필요함

`0033_generic_game_assets.sql`은 기존 `sandbox_games.logo_key`를 `game_assets(LOGO)`로
backfill하고 insert/update/clear를 동기화하는 trigger를 추가합니다. 이 compatibility layer는
retired 상태가 아닙니다.

현재 `D1SandboxGameRepository.setLogo()`가 여전히 다음 write를 수행합니다.

```sql
UPDATE sandbox_games SET logo_key = ?, updated_at = ? WHERE id = ?
```

따라서 trigger 제거, `sandbox_games.logo_key` 제거, migration history 수정은 먼저 write path를
이전하고 검증하는 별도 작업 없이는 안전하지 않습니다.

## 주요 비게임 도메인

- **Identity/auth**: `users`, provider identity/link/merge, user/admin sessions, managed admin
  accounts와 permission grants
- **Score/progression**: score rows, difficulty, attempt consumption, XP ledger, achievements,
  streak
- **Personalization**: favorites, recently played, settings/profile visibility
- **Discord**: link challenges, guild registration/manager, play context, guild XP attribution
- **Creator/Streamer**: creator profile, platform account, metrics, verification/review
- **Operations**: game kill switch, moderation, monitoring indexes, staff/program entitlement

정확한 column, index, foreign key, trigger는 해당 migration과 `packages/db/src/d1` query를
확인해야 합니다. 이 문서는 SQL 원문을 복제하지 않습니다.

## runtime 읽기 조합

Public game은 단일 table만 읽어 완성하지 않습니다.

```text
D1 games
+ D1 live READY game_versions
+ D1 game_assets
+ B2 canonical document
+ B2 immutable manifest/bundle
→ RuntimeGameRegistry / public projection
```

generic row나 canonical/manifest가 불완전하면 legacy sandbox metadata로 fallback하지 않고 제공을
거부합니다. 자세한 불변식은 [Game Platform Architecture](GAME_PLATFORM_ARCHITECTURE.md)를
참조하세요.

## 변경 규칙

- 새 schema 변경은 새 순차 migration으로 추가합니다.
- 이미 적용 가능한 migration을 고치거나 번호를 재사용하지 않습니다.
- compatibility trigger를 지우기 전에 모든 기존 write/read 소비자를 증명합니다.
- `pnpm docs:check`는 migration directory의 가장 최신 filename과 이 문서의 `Latest migration`
  metadata를 비교합니다.
