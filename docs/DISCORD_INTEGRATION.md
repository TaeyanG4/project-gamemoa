# GAMEMOA Discord 연동 (DISCORD_INTEGRATION)

이 문서는 GAMEMOA 플레이어 플랫폼 확장 스프린트의 **Phase F: Discord HTTP Interactions 파운데이션**을
설명합니다. 서버 등록/검색/관리, 길드-로컬 XP, 서버 랭킹(Phase G~H)은 이 파운데이션 위에서 후속 세션이
구축합니다.

---

## 1. 아키텍처 — HTTP Interactions, Gateway 없음

```
Discord 사용자 → /gamemoa 슬래시 커맨드
  → Discord 서버가 서명된 HTTP POST 전송
  → POST /api/discord/interactions (Hono Worker)
  → Ed25519 서명 검증
  → GAMEMOA 애플리케이션 서비스 (기존 use case 재사용)
  → 즉시 JSON 응답 (3초 이내)
```

- **상시 Gateway 연결 없음**: `discord.js` 등 WebSocket 기반 봇 프로세스, VM/Docker 데몬을 사용하지 않습니다.
- **하나의 요청 = 하나의 응답**: Discord가 직접 우리 Worker에 POST하고, 우리는 그 요청의 응답으로 결과를
  돌려줍니다. 별도 팔로우업 메시지나 봇 토큰이 필요 없는 v1 명령어만 우선 구현했습니다.
- **기존 Discord Application 재사용**: 새 Discord Application을 만들지 않고, 기존 로그인/계정 연결에
  사용 중인 Discord Application을 그대로 사용합니다 (OAuth Client ID = Application ID).

---

## 2. 서명 검증 (Ed25519)

Discord는 모든 Interaction 요청에 `X-Signature-Ed25519`, `X-Signature-Timestamp` 헤더를 포함하며,
`timestamp + rawBody`에 대한 Ed25519 서명을 제공합니다. 검증에 실패하면 페이로드를 신뢰하지 않고
**PING을 포함해** 즉시 401을 반환합니다.

- 구현: `apps/api/src/infrastructure/discord/signature.ts`
- Cloudflare Workers의 `crypto.subtle`(Web Crypto API)이 `"Ed25519"` 알고리즘을 네이티브로 지원하므로,
  `tweetnacl` 등 추가 의존성 없이 구현했습니다.
- 원문 바이트(raw body)를 JSON 파싱 전에 그대로 사용해 서명 대상과 정확히 일치시킵니다.
- 테스트: `apps/api/test/discordSignature.test.ts` — Node의 `crypto.generateKeyPairSync("ed25519")`로
  실제 키쌍을 생성해 정상 서명 검증, 변조된 본문, 잘못된 타임스탬프, 다른 키로 만든 서명, 잘못된 헤더를
  각각 검증합니다.

---

## 3. 명령어 (v1)

의도적으로 작게 유지했습니다. 길드 XP 원장이 필요한 명령어(`rank`, `leaderboard`, `play`, `server`)는
Phase H(길드 XP)까지 보류합니다.

| 명령어             | 설명                                                  | 인증 필요 |
| ------------------ | ----------------------------------------------------- | --------- |
| `/gamemoa games`   | 게임 매니페스트 기반 목록 (하드코딩 없음)             | 아니요    |
| `/gamemoa link`    | GAMEMOA 계정과 연동하는 1회용 링크 발급 (ephemeral)   | 아니요    |
| `/gamemoa profile` | 연동된 GAMEMOA 계정의 닉네임/레벨/XP 요약 (ephemeral) | 연동 필요 |

`/gamemoa games`는 `GAME_MANIFEST_MAP`(게임 레지스트리)에서 직접 생성되며, Discord 코드에 게임 목록을
중복 정의하지 않습니다.

---

## 4. `/gamemoa link` — 계정 연동 흐름

서명된 Interaction은 호출한 Discord 사용자 ID를 암호학적으로 증명하지만, 그것만으로는 "이 사람이 특정
GAMEMOA 계정을 소유한다"는 증명이 되지 않습니다. 아래처럼 짧은 수명의 1회용 토큰으로 두 단계를 분리합니다.

1. Discord에서 `/gamemoa link` 실행 → 서버가 무작위 토큰을 생성하고 **해시만 저장**(`discord_link_challenges`
   테이블, 마이그레이션 `0006`), 원문 토큰은 ephemeral 메시지로 1회만 전달됩니다(10분 만료).
2. 사용자가 `https://gamemoa-web.../discord/link?token=...` 링크를 엽니다.
3. 웹페이지가 `GET /api/discord/link/preview?token=...`로 "Discord 계정 @username을 연동하시겠습니까?"를
   먼저 보여줍니다(로그인 불필요, 토큰 자체가 이미 알고 있는 사용자명만 재확인).
4. 로그인 후 `POST /api/discord/link/confirm`을 호출하면, 서버는 **토큰에 바인딩된 discord_user_id**만
   신뢰하고 — **절대 클라이언트가 보낸 discord_user_id를 신뢰하지 않습니다** — 기존
   `IdentityUseCases.linkProvider`를 그대로 재사용합니다.
5. 이미 다른 GAMEMOA 계정에 연동된 Discord 계정이면 기존 `ACCOUNT_ALREADY_LINKED` → Primary Account Wins
   계정 통합 플로우가 그대로 트리거됩니다. **별도의 병합 로직을 새로 만들지 않았습니다.**

---

## 5. 데이터 모델

`packages/db/migrations/0006_discord_link.sql`:

```sql
CREATE TABLE discord_link_challenges (
  token_hash TEXT PRIMARY KEY,      -- 원문 토큰은 저장하지 않음 (SHA-256 해시만)
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT                  -- 1회 사용 후 소비 처리
);
```

세션 토큰(`sessions`)과 동일하게 원문 토큰은 저장하지 않고 해시만 저장하며, `D1SessionRepository`의
토큰 생성/해싱 패턴을 그대로 따릅니다.

---

## 6. 필요한 설정값

| 변수                     | 종류                                        | 용도                                           |
| ------------------------ | ------------------------------------------- | ---------------------------------------------- |
| `DISCORD_APPLICATION_ID` | 비밀 아님 (기존 `DISCORD_CLIENT_ID`와 동일) | 명령어 등록 스크립트에서만 사용                |
| `DISCORD_PUBLIC_KEY`     | 비밀 아님, Worker에 배포됨                  | Interaction 서명 검증                          |
| `DISCORD_BOT_TOKEN`      | **비밀**, Worker에 배포하지 않음            | 로컬에서 명령어 등록 스크립트 실행 시에만 사용 |

Worker 런타임은 `DISCORD_BOT_TOKEN`을 전혀 알지 못합니다 — v1 명령어는 즉시 동기 응답만 사용하므로 봇
토큰이 필요 없습니다. 봇 토큰은 `pnpm discord:commands:register`를 로컬/개인 환경에서 실행할 때만
필요합니다.

`DISCORD_PUBLIC_KEY`가 설정되지 않은 경우 `POST /api/discord/interactions`는 500을 반환하지만 애플리케이션
전체는 정상 부팅됩니다 (선택적 통합 실패가 서비스 전체를 막지 않음). `GET /api/discord/status`로 설정 여부를
확인할 수 있습니다.

---

## 7. 명령어 등록

```bash
DISCORD_APPLICATION_ID=... DISCORD_BOT_TOKEN=... pnpm discord:commands:register
```

- `apps/api/src/infrastructure/discord/commands.ts`가 등록 스크립트와 Interaction 라우터 양쪽의 단일
  진실 공급원이므로, 등록된 명령어와 실제 처리 로직이 어긋날 수 없습니다.
- 전역(global) 명령어로 등록하며, 재실행해도 안전합니다(PUT은 전체 목록을 결정론적으로 교체).
- 전역 등록은 모든 서버/DM에 반영되기까지 최대 1시간 정도 걸릴 수 있습니다.
- 스크립트는 토큰을 절대 출력하지 않습니다.

---

## 8. 외부 설정 필요 (Developer Portal) — 한국어 안내

이 저장소 안에서 완결할 수 없는 부분입니다. 아래는 사용자가 직접 진행해야 합니다.

1. **Discord Developer Portal** (https://discord.com/developers/applications) 접속 → 기존 GAMEMOA
   OAuth 로그인에 사용 중인 Application을 엽니다(새로 만들 필요 없음).
2. **General Information** 탭에서 **Public Key** 값을 복사합니다.
3. GitHub 저장소 → Settings → Secrets and variables → Actions → **Variables** 탭에서
   `DISCORD_PUBLIC_KEY`를 위에서 복사한 값으로 추가합니다 (Secret이 아닌 Variable입니다 — 공개해도
   안전한 값입니다).
4. 저장소에 push하여 배포가 완료된 후, **Interactions Endpoint URL**을
   `https://gamemoa-api.gamemoa.workers.dev/api/discord/interactions`로 설정하고 저장합니다.
   (Discord가 저장 시점에 즉시 PING을 보내 검증하므로, 반드시 `DISCORD_PUBLIC_KEY`가 먼저 배포되어
   있어야 합니다.)
5. **Bot** 탭에서 Bot Token을 생성/복사합니다(저장소나 채팅에 붙여넣지 마세요).
6. 로컬 터미널에서 아래 명령을 실행해 슬래시 명령어를 등록합니다:
   ```bash
   DISCORD_APPLICATION_ID=<Application ID> DISCORD_BOT_TOKEN=<Bot Token> pnpm discord:commands:register
   ```
7. 봇을 사용할 Discord 서버에 Application이 설치되어 있는지 확인합니다(기존 OAuth 설정에서 이미
   설치되어 있을 수 있습니다).

이 단계들이 완료되기 전까지 `POST /api/discord/interactions`는 500(미설정)을 반환하며, 이는 정상적인
안전 상태입니다.

---

## 9. 다음 단계 (이번 세션 범위 밖)

- `/gamemoa rank`, `/gamemoa leaderboard`, `/gamemoa play`, `/gamemoa server` — Discord 길드-로컬 XP
  원장(Phase H)이 선행되어야 합니다.
- Discord 서버 등록/검색/관리 페이지 (Phase G).
- 길드 참여자 랭킹, 주간 XP, 전역 서버 활동 랭킹 (Phase H).

이 원장 패턴(1회용 토큰, 해시 저장, `source_type` 분리)은 `docs/PROGRESSION.md`의 XP 원장 설계를 그대로
재사용할 예정입니다.
