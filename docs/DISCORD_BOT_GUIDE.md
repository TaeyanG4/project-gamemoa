# OwOGG Discord 앱 사용 및 운영 가이드

이 문서는 OwOGG Discord 연동을 처음 사용하는 서버 관리자, 일반 사용자, 운영자와 개발자를 위한 실무 가이드입니다. 현재 구현의 기준은 `apps/api/src/infrastructure/discord/commands.ts`, `interactionHandlers.ts`, `docs/DISCORD_INTEGRATION.md`입니다.

## 1. 먼저 알아둘 점

OwOGG v1은 Discord **HTTP Interactions**를 사용합니다.

- Discord가 서명한 HTTP 요청을 `POST /api/discord/interactions`로 보냅니다.
- Worker가 Ed25519 서명을 확인하고 즉시 응답합니다.
- 상시 WebSocket Gateway 연결이나 `discord.js` 영구 봇 프로세스는 사용하지 않습니다.
- 서버 운영을 위한 VM, Docker 봇 데몬, Gateway daemon을 별도로 실행하지 않습니다.

Discord 앱 설치와 OwOGG 웹의 공개 서버 등록은 서로 다른 단계입니다.

> Discord 앱 설치 ≠ OwOGG 공개 서버 등록

앱을 설치했다고 서버가 자동으로 OwOGG 디렉토리에 게시되지 않습니다. 서버 관리자가 웹에서 공식 Discord 권한을 확인한 뒤 서버를 명시적으로 등록하고 가시성을 선택해야 합니다.

## 2. 서버 관리자: 설치와 서버 등록

### 2-1. Discord 앱 설치

OwOGG의 설치 링크는 Discord Developer Portal의 실제 설정을 기준으로 해야 합니다. 저장소에 애플리케이션 ID와 권한 비트가 없는 환경에서는 임의의 OAuth URL을 만들지 않으며, 웹 가이드에 설치 안내만 표시합니다.

현재 Discord 공식 문서상 다음 원칙을 따릅니다.

- `applications.commands` scope만으로도 서버에 애플리케이션 명령어를 추가할 수 있습니다.
- `bot` scope는 봇 사용자를 서버에 추가하는 별도 흐름이며, 앱의 설치 설정에 따라 필요할 수 있습니다.
- 요청 scope와 봇 권한은 Developer Portal의 Installation 페이지 설정과 현재 제품 요구사항을 함께 확인해야 합니다.
- 설치 URL의 `permissions`, `scope`, `integration_type`을 확인하지 않고 직접 조합하지 않습니다.

공식 참고 문서:

- [Discord OAuth2](https://discord.com/developers/docs/topics/oauth2)
- [Discord Application Commands](https://discord.com/developers/docs/interactions/application-commands)
- [Discord Application Resource](https://discord.com/developers/docs/resources/application)
- [Discord Receiving and Responding to Interactions](https://discord.com/developers/docs/interactions/receiving-and-responding)

### 2-2. OwOGG 웹에서 서버 등록

1. Discord 앱을 서버에 설치하거나 서버에서 사용할 수 있는 상태로 만듭니다.
2. Discord 계정이 필요한 경우 `/owogg link`를 실행합니다.
3. OwOGG 웹에 로그인합니다.
4. `/discord/servers`에서 `내 서버 등록하기`를 선택합니다.
5. OwOGG가 시작한 Discord OAuth에서 `identify guilds` 권한을 승인합니다.
6. OwOGG는 Discord 공식 `/users/@me/guilds` 응답에서 본인이 소유자이거나 `MANAGE_GUILD` 또는 `ADMINISTRATOR` 권한을 가진 길드만 후보로 보여줍니다.
7. 등록할 길드를 선택하고 서버 slug와 설명을 입력합니다.
8. 가시성을 `PUBLIC`, `UNLISTED`, `PRIVATE` 중 하나로 선택합니다.
9. 서버 등록을 확정합니다.

이 등록 흐름의 Discord access token은 길드 후보를 확인한 뒤 저장하지 않습니다. 클라이언트가 임의의 `guild_id`를 보내도 OAuth 후보 목록에 없으면 등록할 수 없습니다.

### 2-3. 가시성

- `PUBLIC`: 공개 디렉토리와 공개 서버 활동 랭킹에 포함됩니다.
- `UNLISTED`: slug를 아는 사용자가 페이지에 접근할 수 있지만 공개 디렉토리와 전역 공개 활동 랭킹에는 포함되지 않습니다.
- `PRIVATE`: 등록 관리자에게만 서버 페이지와 관리 기능을 공개합니다.

앱 설치만으로 어떤 가시성도 자동 선택되지 않습니다.

## 3. 일반 사용자: 계정 연결과 명령어

### 계정 연결

1. Discord 서버 채널에서 `/owogg link`를 실행합니다.
2. 응답으로 받은 1회용 링크를 엽니다.
3. OwOGG 웹에 로그인합니다.
4. `/discord/link`에서 Discord 계정 연결을 확인합니다.

링크는 짧은 시간 후 만료되고 한 번만 사용할 수 있습니다. 이미 연결된 Discord 계정이면 새 연결 토큰을 발급하지 않습니다.

### 명령어 기준

아래 목록은 현재 `commands.ts`에 등록된 실제 명령어입니다. 명령어가 보이는 위치는 앱 설치 컨텍스트와 Discord 서버 설정에 따라 달라질 수 있습니다.

| 명령어               | 목적                                         | 사용 위치                          | 계정 연결     | 등록 서버 | 옵션/예시             | 관련 웹                  |
| -------------------- | -------------------------------------------- | ---------------------------------- | ------------- | --------- | --------------------- | ------------------------ |
| `/owogg games`       | 현재 게시된 게임 목록과 링크 확인            | 명령어가 표시되는 Discord 컨텍스트 | 불필요        | 불필요    | `/owogg games`        | `/games`                 |
| `/owogg link`        | Discord 계정과 OwOGG 계정 연결 시작          | 명령어가 표시되는 Discord 컨텍스트 | 미연결 사용자 | 불필요    | `/owogg link`         | `/discord/link`          |
| `/owogg profile`     | 연결된 프로필의 닉네임, 레벨, 글로벌 XP 확인 | 명령어가 표시되는 Discord 컨텍스트 | 필요          | 불필요    | `/owogg profile`      | `/profile`               |
| `/owogg play`        | 서버 귀속 플레이 링크 생성                   | Discord 서버 채널                  | 필요          | 필요      | 게임 선택은 선택 사항 | `/games`                 |
| `/owogg rank`        | 현재 서버에서 자신의 XP와 순위 확인          | Discord 서버 채널                  | 필요          | 필요      | `/owogg rank`         | 해당 서버 페이지         |
| `/owogg leaderboard` | 서버 XP Top 10과 전체 페이지 링크 확인       | Discord 서버 채널                  | 불필요        | 필요      | `/owogg leaderboard`  | `/discord/servers/:slug` |
| `/owogg server`      | 서버 전체 XP, 주간 XP, 참여자 수 확인        | Discord 서버 채널                  | 불필요        | 필요      | `/owogg server`       | `/discord/servers/:slug` |

### `/owogg play` 게임 옵션

`play`의 `game` 옵션은 현재 게시된 게임 선택 목록에서 고릅니다.

```text
/owogg play
/owogg play game:reaction-time
```

게임을 선택하면 해당 게임 페이지로 이동하고, 선택하지 않으면 `/games`에서 게임을 고를 수 있습니다. 링크에는 15분 만료와 1회 사용 정책이 적용됩니다.

### 자주 보는 오류

- 계정 연결 필요: `/owogg link`를 먼저 실행합니다.
- 서버 미등록 또는 비활성화: 서버 관리자가 `/discord/servers`에서 등록을 완료해야 합니다.
- 서버 채널이 아님: `play`, `rank`, `leaderboard`, `server`는 Discord 서버에서 실행합니다.
- 게임 ID 불명: 명령어의 선택 목록에서 게시된 게임을 고릅니다.
- 링크 만료 또는 재사용: 새 `/owogg play` 링크를 발급합니다.

## 4. XP가 계산되는 방식

OwOGG에는 서로 다른 세 가지 XP가 있습니다.

1. **일반 OwOGG XP**: 사용자 글로벌 진행도와 레벨에 사용됩니다.
2. **Discord 서버별 사용자 XP**: 특정 Guild에서 해당 사용자가 만든 유효한 귀속 활동의 합입니다.
3. **Discord 서버 활동 XP**: 특정 Guild 전체의 활동 합계입니다.

세 값은 자동으로 복사되거나 합쳐지지 않습니다.

예시:

```text
사용자 글로벌 XP: 25,000
새 Guild A: 서버 XP = 0

Guild A에서 /owogg play로 시작한 유효한 게임 완료 +10:
글로벌 XP = 25,010
Guild A 사용자 XP = 10
Guild A 활동 XP = +10
Guild B = 0
```

기존 글로벌 XP 25,000을 새 Guild A에 복사하지 않습니다. Guild B의 XP도 Guild A로 이동하지 않습니다.

글로벌 XP는 인증된 게임 완료마다 기본 +10이며, 같은 사용자와 게임의 UTC 하루 기준 XP 지급 완료 횟수는 최대 10회입니다. 상한 이후에도 플레이와 완료 기록은 가능하지만 추가 글로벌 XP는 0입니다. `eligible_completions`는 도전과제용으로 계속 기록될 수 있습니다.

`/owogg play` 링크로 시작한 완료만 해당 Guild에 귀속됩니다. 서버 귀속은 1회용 Play Context와 XP 원장의 source ID를 함께 확인하며, 하나의 글로벌 XP 원장 이벤트는 최대 하나의 Guild 귀속만 가질 수 있습니다.

## 5. 서버 랭킹과 게임 기록

- **서버 XP 랭킹**: 해당 Guild의 서버별 사용자 XP 합계입니다.
- **주간 서버 XP**: 월요일 00:00 Asia/Seoul 기준으로 계산하며 UTC로 저장된 시각을 변환해 집계합니다.
- **게임별 서버 기록**: 해당 서버에서 OwOGG 활동을 만든 참여자의 기존 `scores` 최고 기록을 게임 매니페스트 정렬 정책으로 표시합니다.
- **전역 Discord 서버 활동 랭킹**: `PUBLIC`이며 `ACTIVE`인 서버만 대상으로 합니다.
- `UNLISTED`와 `PRIVATE` 서버는 공개 전역 서버 랭킹에 들어가지 않습니다.
- 서버 vanity slug는 `/discord/servers/<slug>` 주소에 사용됩니다.
- 참여자 수는 OwOGG XP를 실제로 귀속한 사용자 수이며, OwOGG가 Discord의 전체 멤버 목록을 열거한다는 뜻이 아닙니다.

## 6. 운영자와 개발자 설정

### Worker 설정값

| 설정                     | 종류           | 실제 사용처                                                                       |
| ------------------------ | -------------- | --------------------------------------------------------------------------------- |
| `DISCORD_CLIENT_ID`      | 공개 변수      | Discord 로그인과 서버 등록 OAuth client ID                                        |
| `DISCORD_CLIENT_SECRET`  | 비밀           | Discord authorization code 교환                                                   |
| `DISCORD_REDIRECT_URI`   | 공개 변수      | 로그인, 연결, 서버 등록이 공유하는 단일 `/api/auth/discord/callback`              |
| `DISCORD_PUBLIC_KEY`     | 공개 변수      | HTTP Interaction Ed25519 서명 검증                                                |
| `FRONTEND_URL`           | 공개 변수      | OAuth redirect와 링크 생성                                                        |
| `DISCORD_INSTALL_URL`    | 선택 공개 변수 | Developer Portal에서 명시적으로 만든 안전한 설치 URL. 없으면 웹 CTA를 만들지 않음 |
| `DISCORD_BOT_TOKEN`      | 비밀           | 명령어 등록 스크립트의 일시적 로컬 인증. Worker에 저장하지 않음                   |
| `DISCORD_APPLICATION_ID` | 로컬 공개 값   | 등록 스크립트에서 사용. 없으면 `DISCORD_CLIENT_ID`를 사용                         |

`DISCORD_CLIENT_SECRET`와 `DISCORD_BOT_TOKEN`은 절대로 웹 번들, Git, 로그, 채팅에 기록하지 않습니다.

### Developer Portal

1. Discord Developer Portal에서 OwOGG Application을 엽니다.
2. Installation 페이지에서 지원할 설치 컨텍스트와 기본 설치 설정을 확인합니다.
3. 명령어를 서버에 제공할 방법으로 `applications.commands`와 실제 앱 설정을 확인합니다. 봇 사용자가 필요한 제품 설정이라면 Portal의 `bot` 설정도 함께 검토합니다.
4. Interactions Endpoint URL에 다음 주소를 등록합니다.

```text
https://gamemoa-api.gamemoa.workers.dev/api/discord/interactions
```

5. General Information의 Public Key를 `DISCORD_PUBLIC_KEY`로 배포 설정에 전달합니다.
6. OAuth2 Redirects에는 다음 단일 콜백을 등록합니다.

```text
https://gamemoa-api.gamemoa.workers.dev/api/auth/discord/callback
```

개발 환경에서는 실제 개발 Worker 주소와 현재 `DISCORD_REDIRECT_URI` 값을 사용합니다. 로그인과 LINK를 서로 다른 callback path로 등록하지 않습니다. 현재 코드는 두 흐름을 하나의 callback에서 state 쿠키로 구분합니다.

### 명령어 등록

명령어 정의는 `apps/api/src/infrastructure/discord/commands.ts`가 단일 출처입니다. 로컬에서 필요한 환경변수를 안전하게 주입한 뒤 다음을 실행합니다.

```bash
pnpm discord:commands:register
```

스크립트는 Discord REST API의 전역 명령어 목록을 결정적으로 교체하므로 같은 명령을 다시 실행해도 중복 명령어를 만들지 않습니다. 전역 명령어는 Discord 전파에 시간이 걸릴 수 있으며, 빠른 개발 확인은 공식 문서의 Guild command 방식을 별도로 검토합니다.

현재 저장소의 배포 workflow에는 `DISCORD_PUBLIC_KEY`와 `DISCORD_CLIENT_SECRET` 전달 경로가 있습니다. Developer Portal endpoint 설정, 명령어 등록, `DISCORD_INSTALL_URL` 등록 여부는 저장소만으로 완료를 확정할 수 없으며 **외부 설정 대기**로 확인해야 합니다.

### 운영 확인

- `GET /api/discord/status`: `DISCORD_PUBLIC_KEY` 설정 여부와 안전하게 구성된 설치 링크만 확인
- `POST /api/discord/interactions`: Discord가 보낸 실제 서명 요청으로 PING 검증
- `pnpm discord:commands:register`: 명령어 등록 후 Discord에서 `/owogg` 선택 목록 확인
- `pnpm smoke:prod`: 배포 후 API health와 웹 route/provenance 확인

실제 Discord, YouTube, Twitch, CHZZK, SOOP에 의존하는 자동화 테스트는 만들지 않습니다. 테스트는 서명과 provider fake를 사용합니다.

## 7. 장애 해결

### Interaction endpoint 검증 실패

`DISCORD_PUBLIC_KEY`가 현재 Worker에 전달되었는지, Portal의 endpoint URL이 정확한지, Public Key에 공백이나 따옴표가 섞이지 않았는지 확인합니다.

### 명령어가 보이지 않음

앱 설치 컨텍스트, `applications.commands` 설정, 명령어 등록 성공 여부, 전역 명령어 전파 지연을 순서대로 확인합니다. 앱을 다시 설치하는 것만으로 OwOGG 서버 등록이 완료되지는 않습니다.

### 서버 등록 후보가 없음

로그인한 Discord 사용자가 길드 소유자이거나 `MANAGE_GUILD` 또는 `ADMINISTRATOR` 권한을 갖는지 확인합니다. OwOGG는 모든 Discord 멤버를 나열하지 않으며 공식 OAuth `guilds` 응답만 사용합니다.

### XP가 서버에 쌓이지 않음

서버가 `ACTIVE`인지, Discord 계정과 OwOGG 계정이 연결되었는지, `/owogg play` 링크가 만료되지 않았는지, 링크를 통해 실제 게임 완료를 제출했는지 확인합니다. 글로벌 XP 일일 상한에 도달하면 서버 XP 증가액도 0일 수 있습니다.
