# OwOGG 권한/역할/프로그램 모델 (AUTHORIZATION)

이 문서는 OwOGG의 인가(authorization) 구조 전체를 정의합니다 — **누가 관리자인지, OPERATOR와
MODERATOR는 무엇이 다른지, SYSTEM_DEVELOPER는 무엇을 할 수 있는지, GAME_CREATOR가 왜 Staff
Role이 아닌지, STREAMER와의 관계, 그리고 향후 OwO Plus 구독 연동 지점**까지 새 기여자가 이 한
문서로 이해할 수 있도록 작성되었습니다.

> 이 문서는 실제 구현(마이그레이션 `0025_staff_roles_and_game_creator_program.sql`,
> `packages/core/src/domain/staffRoles.ts`, `domain/gameCreator.ts`) 완료 후 그 코드를 기준으로
> 작성되었습니다. 코드와 문서가 갈리면 코드가 항상 우선합니다.

---

## 0. 🎯 핵심 원칙 — 세 개의 독립된 축

OwOGG의 계정 권한은 **하나의 역할 트리가 아니라 세 개의 독립된 축**으로 모델링됩니다. 한 계정은
이 세 축 각각에서 임의의 조합을 가질 수 있습니다(§7 참고).

| 축                                           | 의미                                 | 값                                                                      | 저장 위치                                 |
| :------------------------------------------- | :----------------------------------- | :---------------------------------------------------------------------- | :---------------------------------------- |
| **Staff Role**<br>(운영 역할)                | OwOGG를 운영하는 인력                | `ADMIN` / `OPERATOR` / `MODERATOR` / `SYSTEM_DEVELOPER` (없으면 `null`) | `admin_accounts.role`                     |
| **Program / Entitlement**<br>(프로그램 자격) | 특정 기능을 쓸 수 있게 승인된 사용자 | `GAME_CREATOR` (게임/맵 등록 자격), `STREAMER` (채널 인증)              | `game_creator_access`, `creator_profiles` |
| **Subscription**<br>(구독)                   | 유료 구독 상태                       | `OWO_PLUS` — **아직 구현되지 않음** (§6)                                | _(없음 — 향후)_                           |

**왜 하나의 트리가 아닌가**: `GAME_CREATOR`/`STREAMER`는 "직원"이 아니라 "이 기능을 쓰도록
승인된 일반 사용자"입니다. 이걸 `ADMIN`의 하위 역할로 넣으면 "게임을 만들 수 있다"와 "다른
유저를 정지시킬 수 있다"가 같은 계층 구조에 섞여, 권한을 좁게 주고 싶을 때(예: 게임만 만들 수
있고 운영 기능은 전혀 없는 사용자) 표현할 방법이 없어집니다. 세 축을 분리하면 `role === null &&
gameCreator.hasAccess === true`(평범한 유저이면서 게임 크리에이터)처럼 정확하게 표현됩니다.

**일반 `USER`**: 위 세 축 어디에도 값이 없는 계정입니다 — 특별한 칭호 없이 그냥 로그인한
계정입니다.

---

## 1. 🏛️ Staff Role — 운영 역할

### 1.1 네 가지 역할

| 역할               | 한글 표기     | 성격                                                                                                                                                                |
| :----------------- | :------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ADMIN`            | 관리자        | **유일한 최상위 역할.** 모든 관리자 권한을 암묵적으로 보유(§1.3). Protected(§2).                                                                                    |
| `OPERATOR`         | 운영자        | 강한 서비스 운영 권한 — 유저 제재, 게임 관리, 콘텐츠 심사, 게임 크리에이터/스트리머 프로그램 관리, 운영 모니터링.                                                   |
| `MODERATOR`        | 모더레이터    | 약한 운영/콘텐츠 관리 권한 — 신고 처리, 콘텐츠 심사, 유저 조회, 제한적 조치. `users.ban`/`games.moderate`/`game_creators.manage`는 **기본으로 없음**(§1.4).         |
| `SYSTEM_DEVELOPER` | 시스템 개발자 | OwOGG **플랫폼 자체**를 만드는 인력. 게임/맵을 만드는 `GAME_CREATOR`와는 완전히 다른 개념(§5). 기본은 내부 진단 도구만 — 관리자 센터 진입 권한도 기본으로 없음(§3). |

한 계정은 `admin_accounts`에 최대 1개의 관리형 행(row)을 가지며, 그 행의 `role` 컬럼이 위 넷 중
하나입니다. `ADMIN_USER_IDS`(환경변수)로만 자격을 얻은 root 계정은 관리형 행이 없어도 항상
`ADMIN`으로 해석됩니다(§4).

### 1.2 권한 카탈로그 (Permission)

`packages/core/src/domain/staffRoles.ts`의 `PERMISSIONS`가 유일한 정의처입니다:

| 권한                     | 게이트하는 기능                                                                                                 |
| :----------------------- | :-------------------------------------------------------------------------------------------------------------- |
| `admin.center.access`    | 관리자 센터(`/admin`) 진입 자체 — ADMIN 역할과는 별개(§3)                                                       |
| `users.view`             | 유저 검색/조회                                                                                                  |
| `users.suspend`          | 유저 일시 정지                                                                                                  |
| `users.ban`              | 유저 영구 차단                                                                                                  |
| `users.score_moderation` | 점수 제출 차단 + 점수 초기화/복원                                                                               |
| `games.moderate`         | 내장 게임 강제 비활성화(킬 스위치)                                                                              |
| `sandbox_games.review`   | 업로드된 게임 버전 심사(승인/반려/공개 전환)                                                                    |
| `sandbox_games.delete`   | 게임 소프트 삭제 — `review`보다 강한 조치, 별도 권한([`GAME_CREATION_GUIDE.md`](GAME_CREATION_GUIDE.md) §3.6.3) |
| `game_creators.manage`   | Game Creator 프로그램 직접 임명/해제 + 신청 심사                                                                |
| `streamers.review`       | Streamer Featured 배지 수동 심사                                                                                |
| `system.monitor`         | 운영 모니터링 대시보드(DAU/WAU, D1 상태)                                                                        |
| `system.dev.access`      | SYSTEM_DEVELOPER 기본 자격 — 내부 진단 도구                                                                     |
| `roles.manage`           | 역할/개별 권한 위임 — **절대 위임 불가**(§1.5)                                                                  |

### 1.3 기본 권한 번들 (Default Permission Bundle)

각 역할은 기본으로 보유하는 권한 묶음이 있습니다. **ADMIN은 이 표에 나열되지 않습니다** — ADMIN은
카탈로그 전체를 암묵적으로 보유하도록 코드에서 특별 취급되어(`hasPermission`), 카탈로그가
늘어나도 최상위 역할이 누락되는 일이 없습니다.

| 권한                     | OPERATOR | MODERATOR | SYSTEM_DEVELOPER |
| :----------------------- | :------: | :-------: | :--------------: |
| `admin.center.access`    |    ✅    |    ✅     |        ❌        |
| `users.view`             |    ✅    |    ✅     |        ❌        |
| `users.suspend`          |    ✅    |    ✅     |        ❌        |
| `users.ban`              |    ✅    |    ❌     |        ❌        |
| `users.score_moderation` |    ✅    |    ❌     |        ❌        |
| `games.moderate`         |    ✅    |    ❌     |        ❌        |
| `sandbox_games.review`   |    ✅    |    ✅     |        ❌        |
| `sandbox_games.delete`   |    ✅    |    ❌     |        ❌        |
| `game_creators.manage`   |    ✅    |    ❌     |        ❌        |
| `streamers.review`       |    ✅    |    ✅     |        ❌        |
| `system.monitor`         |    ✅    |    ❌     |        ✅        |
| `system.dev.access`      |    ❌    |    ❌     |        ✅        |

> ⚠️ MODERATOR의 번들이 OPERATOR의 부분집합처럼 **보이지만**, 이는 우연히 오늘 그런 것이지 코드가
> "OPERATOR ≥ MODERATOR"라는 계층 관계로 강제하는 게 아닙니다. `DEFAULT_ROLE_PERMISSIONS`에
> 역할마다 권한을 **각자 명시적으로 나열**하며, 미래에 두 번들이 갈라져도(예: MODERATOR에만 있는
> 권한이 생겨도) 구조적으로 아무 문제가 없습니다.

### 1.4 개별 권한 위임 (Individual Grant) — `admin_permission_grants`

역할의 기본 번들 위에, **계정별로 개별 권한을 추가로 부여**할 수 있습니다:

```text
유효 권한(Effective Permissions) = 역할의 기본 번들 ∪ 계정별 개별 부여(admin_permission_grants)
```

가장 대표적인 용도는 §3의 `admin.center.access` 위임이지만, 어떤 권한이든 개별 부여할 수
있습니다(단 `roles.manage` 제외, §1.5). `/admin/accounts`의 "개별 권한 위임" 섹션(ADMIN 전용,
§2.2)에서 계정별로 권한을 켜고 끌 수 있습니다.

구현: `hasPermission(role, grantedPermissions, permission)` / `effectivePermissions(role,
grantedPermissions)` (둘 다 `packages/core/src/domain/staffRoles.ts`). 라우트에서는
`requirePermission(admin, "permission.name")`(`apps/api/src/auth/adminSession.ts`)으로
호출하며, 통과하지 못하면 `403 { error: { code: "FORBIDDEN" } }`을 반환합니다.

### 1.5 `roles.manage`는 절대 위임되지 않음

역할 부여/회수, 개별 권한 부여/회수는 `roles.manage` 권한이 필요하지만, 이 권한은 **역할
기본 번들에도, 개별 위임 목록에도 절대 등장하지 않습니다** — 오직 ADMIN의 암묵적 전체 권한
규칙으로만 성립합니다. `isDelegatablePermission()`이 `roles.manage`를 제외하며,
`AdminAccountUseCases.grantPermission`이 이를 시도하면 `PERMISSION_NOT_DELEGABLE` 오류로
방어적으로 재차 거부합니다(도메인 함수 자체도 위임 불가이므로 이중 방어).

### 1.6 역할 부여/회수 권한

- **ADMIN**: 다른 계정의 Staff Role 부여/회수, 개별 권한 부여/회수 가능(`/admin/accounts`).
- **OPERATOR/MODERATOR/SYSTEM_DEVELOPER**: 역할이나 권한을 위임할 수 없음 — `ADMIN` 부여는
  물론, 자기 자신에게 권한을 추가하는 자기 승격(self-escalation)도 불가능.
- `GAME_CREATOR`/`STREAMER` 프로그램은 Staff Role 부여와 무관한 별도 절차입니다(§5).

---

## 2. 🛡️ Protected ADMIN 정책

**ADMIN은 유일하게 보호되는 역할입니다** (`isProtectedStaffRole(role)` = `role === "ADMIN"`).
OPERATOR/MODERATOR/SYSTEM_DEVELOPER는 제품상 필요해지면 다른 스태프에게 제재당할 수 있는
구조이며(현재 이를 실제로 호출하는 코드는 없음), ADMIN만 아래 제약이 적용됩니다. 이 보호는 서로
다른 두 라우트 표면에서 **서로 다른 방식**으로 구현되어 있습니다 — 아래에서 구분해 설명합니다.

### 2.1 일반 유저 제재 도구로부터의 보호 (`/api/admin/users/*`)

유저 검색/정지/차단/점수조정 라우트는 대상 유저가 ADMIN Staff Role로 해석되면, **요청한 사람이
누구인지와 무관하게** 즉시 거부됩니다 — OPERATOR든 MODERATOR든, 심지어 **다른 ADMIN**이든
예외 없이 차단됩니다(이 라우트는 액터가 누구인지에 따른 예외 규칙 자체가 없습니다):

- 정지 (`POST /:userId/suspend`)
- 차단 (`POST /:userId/ban`)
- 점수 제출 차단/초기화/복원 (`POST /:userId/score-submission-block` 등)

시도하면 `403 { error: { code: "ADMIN_PROTECTED" } }`
(`apps/api/src/routes/adminUsers.ts`의 `isProtectedAdminTarget` — 대상의 Staff Role만 확인하고
액터는 확인하지 않음).

### 2.2 관리형 계정(`admin_accounts`) 관리로부터의 보호 (`/api/admin/accounts/*`)

역할 변경·활성화/비활성화·세션 강제 revoke·개별 권한 위임은 **애초에 관리형 ADMIN 계정만 호출할
수 있는 라우트**입니다(`requireManagedAdminTarget`) — OPERATOR/MODERATOR/SYSTEM_DEVELOPER는 이
라우트 자체에 도달하지 못하고 403을 받습니다. **ADMIN 계정끼리는 서로를 관리할 수 있습니다** —
예를 들어 침해가 의심되는 다른 ADMIN 계정을 별도의 ADMIN이 비활성화하는 등, 사고 대응에 실제로
필요한 능력이라 의도적으로 막지 않았습니다. 다만 아래 두 안전장치가 있습니다(`CANNOT_MODIFY_SELF`
/ `LAST_ADMIN` — `AdminAccountUseCases.setStatus`/`setRole`/`revokeSessions` 등):

- **자기 자신은 대상으로 삼을 수 없음**: 스스로를 비활성화/삭제하거나 스스로의 ADMIN 역할을
  제거할 수 없습니다(`CANNOT_MODIFY_SELF`).
- **활성 ADMIN이 1명뿐일 때, 그 마지막 ADMIN은 비활성화/강등될 수 없음**(`LAST_ADMIN`) — 다른
  ADMIN이 시도해도 동일하게 차단되어, 시스템이 ADMIN 0명 상태에 빠지는 것을 원천 방지합니다.

로그아웃, 본인 프로필/설정 변경은 정상적으로 가능합니다 — 위 제약은 "관리 대상으로서의 자신"에
대한 조치에만 적용됩니다.

> ⚠️ **§2.1과 §2.2는 서로 다른 질문에 답합니다**: §2.1은 "이 유저 계정을 제재해도 되는가"(대상이
> ADMIN이면 무조건 아니오), §2.2는 "이 관리형 관리자 계정 자체를 관리해도 되는가"(ADMIN끼리는
> 서로 가능, 자기 자신·마지막 1명만 예외). 하나의 "ADMIN_PROTECTED"라는 개념을 두 라우트가 각자
> 다른 정밀도로 구현하고 있다는 점을 헷갈리지 않는 것이 중요합니다.

### 2.3 인증 자체는 그대로

Protected 정책은 **인가(authorization)** 관련 조치를 막을 뿐, 기존 로그인 절차(§4의 5단계
파이프라인 — Google Step-Up + 관리자 아이디/비밀번호)를 전혀 약화시키지 않습니다. 이 작업의
목표는 "프로필 메뉴에 자연스러운 진입점을 추가하는 것"이지, 인증을 느슨하게 만드는 것이
아닙니다.

---

## 3. 🔑 `admin.center.access` — ADMIN 역할과 분리된 메타 권한

**"관리자 센터에 들어갈 수 있는가"와 "ADMIN 역할을 갖고 있는가"는 서로 다른 질문입니다.**

- `ADMIN`/`OPERATOR`/`MODERATOR`는 기본 번들에 `admin.center.access`가 포함되어 있어 자연히
  관리자 센터류 페이지에 들어갈 수 있습니다.
- `SYSTEM_DEVELOPER`의 기본 번들에는 **의도적으로 빠져 있습니다** — 플랫폼을 만드는 개발자라고
  해서 자동으로 유저 데이터나 운영 도구에 접근할 필요는 없기 때문입니다.
- 신뢰할 수 있는 특정 SYSTEM_DEVELOPER에게 **개별 권한 위임**(§1.4)으로 `admin.center.access`
  (필요하면 `users.view`, `system.monitor` 등도 함께)를 부여하면, 그 사람은 **OPERATOR로
  승격되지 않고도** 관리자 센터 진입 + 지정된 기능만 사용할 수 있습니다.

### 3.1 "진입 = 전체 기능 접근"이 아님

관리자 센터에 들어갔다고 해서 모든 메뉴/기능이 보이는 게 아닙니다 — 각 메뉴/API는 자신에게 필요한
개별 권한을 따로 요구합니다. 예: `admin.center.access` + `users.view`만 가진 SYSTEM_DEVELOPER는
관리자 센터에 들어가 유저 목록을 볼 수는 있지만, `users.ban`이나 `roles.manage`가 없으므로 유저
차단이나 역할 변경은 여전히 403으로 거부됩니다. 프론트엔드(`AdminGateShell`,
`useGatePermissions`)도 서버가 알려준 `permissions` 배열만큼만 메뉴를 그리며, 서버가
독립적으로 각 API를 재검증합니다(§8).

---

## 4. 🔐 인증(Authentication) — 기존 구조 그대로 유지

이 작업은 **누가 무엇을 할 수 있는가(인가)**를 재설계했을 뿐, **누가 진짜 그 사람인지 확인하는
절차(인증)**는 전혀 건드리지 않았습니다. 상세는 [`docs/ADMIN_GUIDE.md`](ADMIN_GUIDE.md) 참고 —
요약하면:

1. OwOGG 로그인 세션 보유
2. 관리자 자격 확인(`ADMIN_USER_IDS` 포함 **또는** 활성 `admin_accounts` 보유)
3. 신선한 Google Step-Up(5분 이내 서명된 ID Token)
4. Google `sub` 계정 바인딩 검증
5. 관리자 전용 아이디/비밀번호 인증(PBKDF2-HMAC-SHA256)

이 5단계를 통과해야 `owogg_admin_session`이 발급되며, **이 문서가 다루는 Staff Role/권한
체계는 이 세션이 이미 발급된 이후에 "무엇을 할 수 있는가"를 결정하는 레이어**입니다.

### 4.1 `ADMIN_USER_IDS`(root)와 `admin_accounts.role`의 관계

`ADMIN_USER_IDS`는 **"보호된 부트스트랩/복구용 identity"** 이지 그 자체가 역할 시스템이
아닙니다(`resolveEffectiveStaffRole`, `apps/api/src/auth/adminEligibility.ts`):

- 관리형 `admin_accounts` 행이 있으면 **그 행의 `role`이 항상 우선**합니다 — `ADMIN_USER_IDS`에
  올라 있어도 관리형 행의 역할이 `OPERATOR`면 일상적으로는 OPERATOR로 동작합니다(root 자격은
  승격 수단이 아니라 최후의 복구 경로).
- 관리형 행이 아직 없는 root 전용 계정(예: 부트스트랩 이전, 또는 두 번째 `ADMIN_USER_IDS` 항목이
  자기 계정을 만들지 않은 경우)은 **항상 `ADMIN`**으로 해석됩니다 — root 자격이 "보호된 관리자
  identity"라는 성격을 갖기 때문에 이보다 낮은 등급으로 해석되지 않습니다.

---

## 5. 🧩 GAME_CREATOR — Staff Role이 아니라 Program/Entitlement

**GAME_CREATOR는 직함이 아니라 "게임/맵을 등록하도록 승인된 사용자"라는 상태입니다.** 코드
어디에도 `role === "GAME_CREATOR"` 같은 인가 조건이 없습니다 — 대신 `game_creator_access`
테이블의 존재/상태(`ACTIVE`)로 표현됩니다.

### 5.1 GAME_CREATOR ≠ SYSTEM_DEVELOPER

|                           | GAME_CREATOR            | SYSTEM_DEVELOPER            |
| :------------------------ | :---------------------- | :-------------------------- |
| 만드는 대상               | 게임/맵 (사용자 콘텐츠) | OwOGG 플랫폼 자체           |
| 축                        | Program/Entitlement     | Staff Role                  |
| 저장 위치                 | `game_creator_access`   | `admin_accounts.role`       |
| 관리자 센션(step-up) 필요 | ❌                      | ✅ (다른 Staff Role과 동일) |
| 다른 유저 게임 수정 가능? | ❌ (본인 게임만, §5.4)  | 해당 없음                   |

두 개념을 혼동하지 않는 것이 이 문서에서 가장 중요한 구분 중 하나입니다 — 이름이 비슷해 보여도
완전히 다른 축의, 완전히 다른 사람을 가리킵니다.

### 5.2 접근 경로 두 가지 (병행)

```text
                        ┌── ① 관리자 직접 임명/해제 (기존, 그대로 유지) ──┐
                        │    ADMIN/OPERATOR → POST/DELETE                │
                        │    /api/admin/game-creators                    │
USER ──────────────────►│                                                 ├──► GAME_CREATOR ACCESS (ACTIVE)
                        │                                                 │      ↓
                        └── ② 셀프서비스 신청 (신규) ──────────────────────┘   게임 크리에이터 센터
                             POST /api/dev/apply → PENDING                    (/game-creator)
                             → ADMIN/OPERATOR 심사(승인/반려)
                             → 승인 시 자동으로 ①과 동일한 grant() 호출
```

- **① 관리자 직접 임명**: `game_creators.manage` 권한을 가진 ADMIN/OPERATOR가 특정 유저에게
  바로 접근 권한을 부여합니다. 신청 절차 없이도 계속 동작하는, 이 기능의 원래 경로입니다.
- **② 셀프서비스 신청(이번에 추가)**: 일반 유저가 `POST /api/dev/apply`로 신청서(선택적
  메시지 포함)를 제출하면 `game_creator_applications`에 `PENDING` 행이 생기고,
  `game_creators.manage` 권한을 가진 스태프가 `/admin/game-creators`에서 승인/반려합니다.
  승인되면 내부적으로 ①과 동일한 `grant()`가 호출되어 두 경로가 같은 최종 상태로 수렴합니다.
  유저당 동시에 `PENDING` 신청은 1개만 허용됩니다(DB partial unique index로 강제 —
  `idx_game_creator_applications_one_pending_per_user`). 신청은 본인이 언제든 철회
  (`WITHDRAWN`)할 수 있고, 반려되어도 다시 신청할 수 있습니다.

### 5.3 신청 자격 — `canApplyForGameCreator()` (§6 참고)

**2026-08-18 운영 결정: 셀프서비스 신청은 현재 닫혀 있습니다**(`canApplyForGameCreator()`가
`false` 반환) — 프로그램을 실제로 운영할 준비가 아직 안 되어, 지금 신청을 받아도 심사할 계획이
없기 때문입니다("추후 업데이트 예정"). 프론트엔드(`/game-creator`)는 이 상태를 신청 폼 대신
안내 메시지로 보여줍니다. "OwO Plus 구독이 신청 자격을 준다"는 향후 정책(§6)과는 무관한, 순수
운영상의 온/오프 스위치입니다 — 이 함수 하나만 다시 `true`로 바꾸면 재개되도록 추상화되어 있고,
호출부(`apply()`)나 계약(`GameCreatorMeResponseSchema.canApply`)은 전혀 바뀌지 않습니다. 관리자
직접 임명(①)과 §5.3a의 스태프 암묵 부여는 이 스위치와 무관하게 계속 동작합니다 — 닫힌 건 "신청"
경로 하나뿐입니다.

### 5.3a 스태프 암묵 부여 — `hasImplicitGameCreatorAccess()`

**2026-08-18 추가**: `ADMIN`/`OPERATOR`/`SYSTEM_DEVELOPER`는 별도 임명이나 신청 없이 Game
Creator 접근 권한을 **암묵적으로** 보유합니다 — 운영/개발 스태프가 파이프라인을 테스트하거나
지원할 때 매번 수동으로 권한을 부여받지 않아도 되게 하기 위함입니다. `MODERATOR`는
제외됩니다(다른 곳의 기본 권한 번들이 좁은 것과 같은 이유). 이 규칙은 **GAME_CREATOR를 Staff
Role로 만들지 않습니다** — 여전히 별도 축이며, 단지 "이 세 역할을 보유하는 것도 admin 직접 임명·
신청 승인과 마찬가지로 접근 자격의 한 경로가 된다"는 정책입니다. 실제 `game_creator_access` 행
상태와 항상 OR로 결합되며, 이 규칙이 그 행을 대체하지 않습니다 — MODERATOR나 일반 USER의 실제
부여/회수는 그대로 동작합니다.

### 5.4 GAME_CREATOR가 할 수 있는 것 / 없는 것

**할 수 있음**: 게임 크리에이터 센터(`/game-creator`) 접근, 자신의 게임 등록/ZIP 업로드/버전
관리/심사 제출/제출 철회, 본인 게임 상태·통계 조회.

**할 수 없음**: 다른 크리에이터의 게임 수정(백엔드가 **소유권을 별도로 검증** —
`developer_user_id`가 요청자와 일치하는지 게임별로 확인, 접근 권한이 있다는 사실만으로는
충분하지 않음), 운영 기능, 관리자 기능, 유저 제재, 시스템 개발 관련 기능.

상세 업로드/심사 파이프라인(20MiB/50MiB/300개 파일 제한, 2개 동시 심사 슬롯, B2 저장, 불변
버전 등)은 이 문서의 범위 밖이며 [`docs/GAME_CREATION_GUIDE.md`](GAME_CREATION_GUIDE.md) §3이
원천입니다 — 이번 작업은 그 정책 숫자·B2/도메인 인프라를 전혀 바꾸지 않았습니다.

---

## 6. 💳 Subscription — OWO_PLUS (향후 계획, 현재 미구현)

**현재 저장소 어디에도 구독/결제 시스템이 존재하지 않습니다** — 테이블, 라우트, 계약(contract)
전부 없음(저장소 전체 검색으로 확인). 이 절은 향후 계획을 기록하되, **아직 없는 기능을 있는
것처럼 서술하지 않기 위해** 명확히 "향후 계획"으로 표시합니다.

### 6.1 의도된 흐름 (향후)

```text
USER → OWO_PLUS 구독(결제) → 구독 활성 → GAME_CREATOR 신청 자격 획득
     → 신청(§5.2 ②) → 관리자 심사 → 승인 → GAME_CREATOR Access → 게임 크리에이터 센터
```

**확정된 사실은 단 하나뿐입니다**: "OwO Plus는 GAME_CREATOR 신청 자격을 주는 데 쓰일
예정이다." 그 외 아래는 전부 **미정**이며, 이 저장소의 어떤 코드도 이 중 하나를 전제하고 있지
않습니다:

- 승인 이후에도 구독을 계속 유지해야 하는지
- 신청 시점에만 필요하고 이후엔 무관한지
- 구독 만료가 업로드만 막는지, 다른 기능도 막는지
- 기존에 공개된 게임이 구독 만료 후에도 유지되는지

### 6.2 추상화 경계

구독 정책이 정해지면 아래 정책 훅들(현재는 `canApplyForGameCreator()` 하나만 존재)을 통해서만
연결되도록 설계되었습니다 — 호출부를 건드리지 않고 정책 함수 내부만 교체하는 것이 목표입니다:

- `canApplyForGameCreator()` — 구현됨(§5.3), 현재 항상 `true`.
- `canCreateGame()`, `canUploadGameVersion()` 등 — **아직 만들어지지 않음.** 실제로 구독 정책이
  "업로드도 막아야 한다"로 확정되는 시점에, 이미 존재하는 업로드 라우트
  (`apps/api/src/routes/devGames.ts`) 안에 훅을 추가하면 됩니다.

### 6.3 데이터 모델 원칙

구독(향후 `subscriptions` 또는 유사 테이블), 신청(`game_creator_applications`), 접근 권한
(`game_creator_access`)은 **서로 다른 개념이며 하나의 행으로 합쳐지지 않습니다** — 구독 정책이
나중에 독립적으로 바뀔 수 있기 때문입니다(예: "구독 만료돼도 이미 승인된 크리에이터는 유지"처럼
정책이 갈릴 수 있음). 지금은 구독 테이블 자체가 없으므로 이 원칙은 설계 지침으로만 존재합니다.

---

## 7. 🎥 STREAMER — GAME_CREATOR와 같은 축, 다른 데이터

STREAMER도 GAME_CREATOR와 마찬가지로 **Staff Role이 아니라 Program/Entitlement**입니다. 다만
완전히 별개의 기존 시스템을 그대로 재사용합니다 — 새로 만들지 않았습니다.

### 7.1 기존 Creator 시스템 = STREAMER 축

[`docs/CREATOR_SYSTEM.md`](CREATOR_SYSTEM.md)에 이미 정의된 `creator_profiles`/
`creator_platform_accounts`(YouTube/CHZZK/SOOP/Twitch 채널 소유권 OAuth 인증)가 바로 이
문서에서 말하는 STREAMER 프로그램입니다.

**중요한 차이점 — STREAMER는 GAME_CREATOR와 달리 승인 절차가 없습니다**: 채널 소유권 OAuth
인증에 성공하면 `creator_profiles.status`가 즉시 `VERIFIED`가 됩니다
(`verifyChannelOwnership()`). 관리자 심사가 있는 건 오직 별도의 **Featured 배지**(대형
크리에이터 큐레이션)뿐입니다 — 기본 STREAMER 상태 자체와는 다른, 선택적인 상위 단계입니다.

이 저장소에 `MyAccessResponseSchema.streamer.isVerified`는 그래서 `creator_profiles.status ===
'VERIFIED'`를 그대로 읽는 **읽기 전용 필드**입니다 — GAME_CREATOR처럼 별도 신청/승인 테이블을
새로 만들지 않았습니다. 존재하지 않는 절차를 흉내 내지 않기 위한 의도적 선택입니다.

### 7.2 GAME_CREATOR와의 공통점/차이점

|                | GAME_CREATOR                                       | STREAMER                                        |
| :------------- | :------------------------------------------------- | :---------------------------------------------- |
| 축             | Program/Entitlement                                | Program/Entitlement                             |
| 승인 절차      | 있음 (관리자 직접 임명 또는 신청→심사)             | **없음** (OAuth 인증 성공 = 즉시 획득)          |
| 저장 테이블    | `game_creator_access`, `game_creator_applications` | `creator_profiles`, `creator_platform_accounts` |
| 상위 선택 단계 | 없음                                               | Featured 배지 (관리자 수동 심사)                |
| 전용 센터      | `/game-creator` (게임 크리에이터 센터)             | 없음 — `/settings`의 크리에이터 인증 섹션       |

### 7.3 명명 규칙 — bare "CREATOR" 금지

이름 충돌을 피하기 위해 **단독으로 "크리에이터"라는 용어를 쓰지 않습니다**:

- 게임 제작 관련: **게임 크리에이터**(GAME_CREATOR), "게임 크리에이터 센터"
- 방송 관련: **스트리머**(STREAMER), "스트리머 채널 인증"
- 기존 코드베이스의 `creator_profiles`/`CreatorUseCases`/`docs/CREATOR_SYSTEM.md` 같은 기존
  식별자는 스트리머 축을 가리키는 **레거시 명명**이며(이 기능이 이 저장소에 먼저 존재했음),
  변경 범위가 크고 실익이 적어 그대로 유지했습니다 — 새로 짜는 코드/문서에서는 "스트리머"를
  명시적으로 씁니다.

---

## 8. 🖥️ 프론트엔드 — 역할/프로그램별 센터

### 8.1 라우트

| 경로                        | 대상                                               | 게이트                                                  |
| :-------------------------- | :------------------------------------------------- | :------------------------------------------------------ |
| `/admin`                    | ADMIN (그리고 모든 Staff Role의 최초 step-up 지점) | `admin.center.access` (ADMIN은 암묵적 통과)             |
| `/ops`                      | OPERATOR                                           | `admin.center.access`                                   |
| `/mod`                      | MODERATOR                                          | `admin.center.access`                                   |
| `/system-dev`               | SYSTEM_DEVELOPER                                   | `system.dev.access` (`admin.center.access`가 아님 — §3) |
| `/game-creator`             | GAME_CREATOR (신청 포함)                           | 로그인만 (프로그램 상태에 따라 페이지 내부가 분기)      |
| `/settings#streamer-center` | STREAMER                                           | 로그인만                                                |
| `/admin/accounts`           | ADMIN 전용                                         | 역할/권한 위임 UI                                       |
| `/admin/game-creators`      | `game_creators.manage`                             | 직접 임명 + 신청 심사                                   |

기존에 존재하던 라우트(`/admin`, 게임 크리에이터 관련 admin 경로)는 URL을 바꾸지 않고 라벨/내부
로직만 갱신했습니다. `/ops`/`/mod`/`/system-dev`/`/game-creator`는 이번에 신설된 라우트입니다.

### 8.2 프로필 드롭다운

`Header.tsx`가 로그인 시 `GET /api/me/access`를 한 번 호출해 아래를 조합해 보여줍니다(여러
상태가 동시에 성립하면 전부 표시 — 예: ADMIN이면서 GAME_CREATOR면 "관리자 센터"와 "게임 크리에이터
센터" 둘 다):

- `staffRole`에 따라 정확히 하나의 항목: 관리자 센터 / 운영 센터 / 모더레이션 / 시스템 개발
- `gameCreator.hasAccess` → "게임 크리에이터 센터", 아니면 `canApply`(또는 `PENDING` 상태) →
  "게임 크리에이터 신청" 계열 항목
- `streamer.isVerified` → "스트리머 센터"
- 위 셋 다 해당 없는 평범한 USER는 **기존 메뉴만** 보입니다 — 아무 것도 추가되지 않습니다.

### 8.3 `useAdminGate` — Step-Up을 중복 구현하지 않음

`/ops`/`/mod`/`/system-dev`는 각자 별도의 Google Step-Up UI를 다시 구현하지 않습니다.
`owogg_admin_session` 쿠키는 모든 페이지에서 공유되므로, `/admin`에서 이미 Step-Up을 완료한
스태프는 이 페이지들에 바로 진입합니다. 아직 Step-Up을 하지 않은 사람은 "Step-Up 필요" 안내와
함께 `/admin`으로의 링크만 봅니다.

---

## 9. 🔒 백엔드 강제 — 프론트엔드는 보안이 아니다

프론트엔드에서 메뉴를 숨기는 것은 UX일 뿐 보안이 아닙니다. 실제 인가는 항상 서버가 각 요청마다
독립적으로 재검증합니다:

- 일반 USER가 `/api/admin/*`를 직접 호출 → `requireElevatedAdmin`이 세션 단계에서 차단.
- `admin.center.access` 없는 SYSTEM_DEVELOPER가 admin 계열 API를 직접 호출 →
  `requirePermission`이 403.
- GAME_CREATOR가 다른 유저의 게임 ID로 수정 API 호출 → 소유권 검증(§5.4)에서 403.
- MODERATOR가 ADMIN 대상 차단 API를 직접 호출 → Protected ADMIN 정책(§2)이 403
  `ADMIN_PROTECTED`.

패턴(`apps/api/src/routes/admin*.ts` 전반):

```ts
const admin = await requireElevatedAdmin(c);
if (isElevatedAdminResponse(admin)) return admin; // 세션/자격 게이트
const denied = requirePermission(admin, "users.ban"); // 권한 게이트
if (denied) return denied;
// ... 실제 로직. 리소스 소유권이 있다면 여기서 별도로 검증.
```

---

## 10. 🗃️ DB 스키마 요약

마이그레이션 `0025_staff_roles_and_game_creator_program.sql`(전체는
[`packages/db/migrations/`](../packages/db/migrations/) 참고)이 이 문서가 설명하는 구조의
원천입니다. 상세 ERD는 [`docs/DATABASE.md`](DATABASE.md)를 참고하세요. 핵심 변경:

| 테이블                          | 상태                                            | 비고                                                                             |
| :------------------------------ | :---------------------------------------------- | :------------------------------------------------------------------------------- |
| `admin_accounts.role`           | 값 변경                                         | `'SUPERADMIN'\|'ADMIN'` → `'ADMIN'\|'OPERATOR'\|'MODERATOR'\|'SYSTEM_DEVELOPER'` |
| `admin_permission_grants`       | 신규                                            | 개별 권한 위임 (§1.4)                                                            |
| `game_creator_access`           | **이름 변경만** (구 `game_developers`)          | 행/키/FK 전부 그대로                                                             |
| `game_creator_access_audit_log` | **이름 변경만** (구 `game_developer_audit_log`) | 상동                                                                             |
| `game_creator_applications`     | 신규                                            | 셀프서비스 신청 (§5.2 ②)                                                         |

**데이터 손실 없음**: 테이블 이름 변경은 `ALTER TABLE ... RENAME`으로 처리되어 행 데이터가
전혀 이동하지 않으며, `admin_accounts.role`의 값 변경도 UPDATE 두 문장으로 기존 관리자를
정확히 동일한 실권한 등급으로 재매핑합니다(§11).

---

## 11. 📜 레거시 SUPERADMIN — 감사 및 이관 기록

### 11.1 기존 상태

이관 전 `admin_accounts.role`은 `'SUPERADMIN' | 'ADMIN'` 두 값이었습니다. 실제 라우트 코드
감사 결과, **SUPERADMIN만 계정 관리(`/admin/accounts`) 기능을 사용할 수 있었고**, 그 외 모든
관리자 라우트(유저 제재, 게임 관리, 모니터링, 크리에이터 심사, 샌드박스 게임 심사 등)는 역할을
구분하지 않고 "활성 관리자 계정인가"만 확인했습니다 — 즉 구 ADMIN 등급도 사실상 오늘의 OPERATOR와
동일한 폭의 권한을 이미 갖고 있었습니다.

### 11.2 이관 매핑

| 이전         | 이후       | 근거                                                                         |
| :----------- | :--------- | :--------------------------------------------------------------------------- |
| `SUPERADMIN` | `ADMIN`    | 유일하게 계정 관리 가능했던 최상위 등급 → 새 모델의 유일한 최상위 역할       |
| `ADMIN`(구)  | `OPERATOR` | 계정 관리를 제외한 모든 기능에 이미 접근 가능했던 등급 → 동일한 폭의 새 이름 |

```sql
-- 순서가 중요합니다: OPERATOR 이관을 먼저 실행해야 두 번째 UPDATE가 방금 쓴 행을 다시 잡지 않습니다.
UPDATE admin_accounts SET role = 'OPERATOR' WHERE role = 'ADMIN';
UPDATE admin_accounts SET role = 'ADMIN' WHERE role = 'SUPERADMIN';
```

**기존 관리자 중 권한을 잃은 사람은 없습니다** — 전원이 이관 전과 정확히 동일한 실권한 등급으로
재매핑되었으며(이름만 바뀜), `ADMIN_USER_IDS`에 등록된 root 자격도 그대로 유지됩니다.

### 11.3 이관 이후 상태

- 런타임 코드 어디에도 `"SUPERADMIN"` 문자열 조건이 없습니다(프론트/백엔드 전체 검색 완료).
- 계약(`packages/contracts/src/admin.ts`)의 역할 enum이 새 4개 값으로 교체되어, **새
  SUPERADMIN 생성 자체가 스키마 레벨에서 불가능**합니다.
- `packages/db/migrations/0016_admin_accounts.sql`(SUPERADMIN을 원래 만든 마이그레이션)은
  이관 대상이 아니라 **불변 이력**이므로 수정하지 않았습니다 — 마이그레이션 파일은 실행된 적이
  있으면 사후 편집하지 않는다는 원칙에 따른 것입니다. 과거 마이그레이션에 등장하는 `SUPERADMIN`
  문자열은 "그 시점엔 실제로 그런 값을 만들었다"는 역사적 사실이며 레거시 audit 대상이 아닙니다.
- 테스트 픽스처(`apps/api/test/*.test.ts`, `packages/db/test/*.test.ts`)에 남아 있던
  `SUPERADMIN` 리터럴/식별자도 실제 역할 값 기준으로 전부 갱신했습니다 — 존재하지 않는 값을
  테스트가 계속 사용 중이었다면 그 자체로 오해의 소지가 있기 때문입니다.

---

## 12. ✅ 현재 구현 vs 향후 계획 — 한눈에

| 항목                                                            | 상태                                                                                       |
| :-------------------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| Staff Role 4종 + 권한 카탈로그 + 개별 위임                      | ✅ 구현됨                                                                                  |
| Protected ADMIN 정책                                            | ✅ 구현됨                                                                                  |
| `admin.center.access` 위임                                      | ✅ 구현됨                                                                                  |
| GAME_CREATOR 직접 임명                                          | ✅ 구현됨 (기존 기능 유지)                                                                 |
| GAME_CREATOR 셀프서비스 신청/심사 (기능 자체)                   | ✅ 구현됨                                                                                  |
| GAME_CREATOR 셀프서비스 신청 **오픈 여부**                      | ⏸️ **임시로 닫힘 — 추후 업데이트 예정** (`canApplyForGameCreator()`, 2026-08-18 운영 결정) |
| GAME_CREATOR 스태프 암묵 부여 (ADMIN/OPERATOR/SYSTEM_DEVELOPER) | ✅ 구현됨 (신규, 2026-08-18)                                                               |
| STREAMER (채널 인증)                                            | ✅ 구현됨 (기존 기능, 문서상 재정의만)                                                     |
| SUPERADMIN → ADMIN/OPERATOR 이관                                | ✅ 완료                                                                                    |
| **OWO_PLUS 구독 시스템**                                        | ❌ **미구현 — 향후 계획** (§6)                                                             |
| OWO_PLUS → GAME_CREATOR 신청 자격 연동                          | ❌ **미구현 — 정책 훅만 존재** (`canApplyForGameCreator()`)                                |
| `canCreateGame()`/`canUploadGameVersion()` 등 추가 구독 정책 훅 | ❌ **미구현 — 필요 시점에 추가**                                                           |

---

## 13. 🔗 관련 문서

- **관리자 인증(다층 Step-Up) 상세**: [`docs/ADMIN_GUIDE.md`](ADMIN_GUIDE.md)
- **게임 크리에이터 업로드/심사 파이프라인 상세**: [`docs/GAME_CREATION_GUIDE.md`](GAME_CREATION_GUIDE.md) §3
- **게임 크리에이터 실사용 가이드**: [`docs/GAME_UPLOAD_GUIDE.md`](GAME_UPLOAD_GUIDE.md)
- **스트리머/Featured 인증 시스템**: [`docs/CREATOR_SYSTEM.md`](CREATOR_SYSTEM.md)
- **DB 스키마/ERD**: [`docs/DATABASE.md`](DATABASE.md)
- **전체 아키텍처**: [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)
- **도메인 소스**: [`packages/core/src/domain/staffRoles.ts`](../packages/core/src/domain/staffRoles.ts), [`packages/core/src/domain/gameCreator.ts`](../packages/core/src/domain/gameCreator.ts)
- **마이그레이션 원문**: [`packages/db/migrations/0025_staff_roles_and_game_creator_program.sql`](../packages/db/migrations/0025_staff_roles_and_game_creator_program.sql)
