# OwOGG Discord 기술 연동 사양서 (DISCORD_INTEGRATION)

이 문서는 OwOGG의 Discord HTTP Interactions, Ed25519 서명 검증, D1 데이터 모델, 길드 XP 귀속 파운데이션 및 OAuth 연동 기술 아키텍처를 정의합니다.

---

## 1. 🏗️ 기술 아키텍처 (HTTP Interactions)

```text
Discord Client (User) ➔ /owogg 슬래시 커맨드
        ↓ (HTTPS POST with Ed25519 Signature)
Cloudflare Workers (`POST /api/discord/interactions`)
        ↓
Ed25519 서명 검증 (`crypto.subtle.verify`)
        ↓
Application Services & Use Cases
        ↓
JSON / Embed 즉시 응답 (3초 이내)
```

- **무상태(Stateless) & 무데몬**: WebSocket Gateway 데몬이나 Node.js 상시 프로세스 없이 Cloudflare Workers의 HTTP 엔드포인트로만 동작합니다.
- **Ed25519 서명 검증**: `apps/api/src/infrastructure/discord/signature.ts`에서 Web Crypto API를 사용하여 Discord 요청의 무결성을 검증합니다 (`DISCORD_PUBLIC_KEY` 환경변수 사용).

---

## 2. 🔐 3종 XP 개념의 엄격한 분리 (XP Attribution Invariants)

1. **Global OwOGG User XP**: 전체 플랫폼에서 개인의 활동 레벨 (`user_progress`, `xp_events`).
2. **Discord Guild-local User XP**: 특정 Discord 서버 내에서 개인의 기여 XP (`discord_guild_xp_events`를 `guild_id`+`user_id`로 합산).
3. **Discord Guild Activity XP**: 특정 Discord 서버의 총합 누적 활동 XP (`discord_guild_xp_events`를 `guild_id`로 합산).

> **핵심 불변식**:
>
> - 글로벌 25,000 XP를 보유한 사용자가 새로운 길드에 참여하더라도 해당 길드의 로컬 XP는 **0에서 시작**합니다.
> - 점수 완료 시 실제 지급된 글로벌 XP(+10 또는 상한 시 0)와 동일한 양만 길드 XP로 1:1 원자적으로 귀속됩니다 (`UNIQUE(source_xp_event_id)` 제약).

---

## 3. 🎲 1회용 Play Context 및 Referer 누출 차단

- `/owogg play [game]` 실행 시 1회용 Play Context 토큰(`discord_play_contexts`, 15분 만료)을 발급합니다.
- DB에는 토큰의 SHA-256 해시만 저장됩니다.
- 웹 클라이언트는 URL Fragment(`#play_token=...`)에서 토큰을 추출한 직후 `history.replaceState`로 URL에서 제거하여 HTTP Referer 누출을 방지합니다.

---

## 4. 🗄️ D1 데이터베이스 스키마

- `discord_link_challenges`: 계정 연동용 1회용 해시 챌린지 (마이그레이션 `0006`)
- `discord_server_registration_challenges`: 서버 등록 권한 검증용 1회용 챌린지 (`0007`)
- `discord_guilds`: 등록된 Discord 서버 메타데이터 (`guild_id`, `slug`, `visibility`) (`0007`)
- `discord_guild_xp_events`: 길드 XP 귀속 원장 (`guild_id`, `user_id`, `amount`,
  `UNIQUE(source_xp_event_id)`) (`0008`) — 길드 내 유저별 XP와 길드 전체 활동 XP는 별도 집계
  컬럼/테이블 없이 이 원장을 그때그때 `SUM(amount)`으로 합산해 계산합니다.
- `discord_play_contexts`: 1회용 플레이 세션 컨텍스트 (`0008`)

마이그레이션별 현재 schema는 [Database](DATABASE.md)와 실제 migration 파일이 권한 원천입니다.
과거 Phase 구축 서사와 설치/credential/장애 대응 runbook은 현재 저장소에 없으며, 필요한 운영
절차는 별도 운영 문서 단계에서 현재 환경을 검증한 뒤 작성해야 합니다.
