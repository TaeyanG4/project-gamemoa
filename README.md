# OwOGG

설치 없이 웹 브라우저에서 바로 즐기는 가벼운 미니게임 모음 플랫폼입니다.

- 프로덕션: [owogg.com](https://owogg.com)
- API: `api.owogg.com`

Game Plugin Architecture와 Clean Layered Monorepo Architecture를 기반으로 설계되었으며, CrazyGames·MiniGame.com류의 UI/UX 패턴(접이식 사이드바, 카테고리 필터, 고밀도 카드 그리드)을 결합해 1초 만에 플레이 가능한 카탈로그를 제공합니다.

---

## 핵심 기능

**게임 컬렉션 (4종)**

- 반응속도 테스트 — 밀리초 단위 반응속도 측정, S~F 등급 판정
- 순서 기억력 테스트 — 패턴 시퀀스 암기 및 최고 레벨 도전
- 에임 테스트 — 무작위 타겟 정밀 타격, normal/hard 난이도 지원
- 타자 속도 테스트 — 60초 연속 입력, WPM/CPM/정확도 실시간 측정

게임별 메타데이터(지원 입력 방식, 리플레이 지원 여부, 난이도 구성)는 `GameManifest` 계약으로 표준화되어 있으며, 난이도가 있는 게임은 서버 리더보드가 난이도별로 분리됩니다. 자세한 내용은 `docs/GAME_CREATION_GUIDE.md` 참고.

**계정 & 개인화**

- Google / Discord OAuth 로그인 — 기본적으로 별도 계정 유지, 사용자 명시 요청 시에만 Primary Account Wins 방식으로 계정 통합
- 즐겨찾기 · 최근 플레이 — 로그인 계정은 서버(D1)에 저장, 게스트는 로컬스토리지에 보존 후 로그인 시 1-way 동기화
- 프로필(`/users/:id`)에서 즐겨찾기·최근 플레이를 각각 공개/비공개로 설정 가능 — 기본값은 비공개
- 설정(`/settings`)에서 닉네임/국가·지역 변경, 연결된 로그인 계정 관리, 크리에이터 채널 인증

**진행도 시스템 (XP / 레벨 / 도전과제)**

서버 권위 XP(인증된 게임 완료 1회당 +10, 유저×게임×UTC일 기준 최대 10회 상한), 원장(`xp_events`) 기반 멱등 지급, 결정론적 레벨 공식(`100×(L-1)²`), 7종 초기 도전과제, 글로벌 XP 리더보드. 게임 점수(실력)와 XP(활동)는 항상 분리되어 랭킹 무결성을 해치지 않습니다. 자세한 내용은 `docs/PROGRESSION.md` 참고.

**게임 결과 공유**

X(트위터) 인텐트 공유, Discord용 서식 텍스트 클립보드 복사, 결과 카드 스크린샷을 PNG로 캡처해 클립보드에 복사(미지원 브라우저는 파일 다운로드로 대체).

**Discord 통합**

- HTTP Interactions 기반 슬래시 커맨드(`/owogg games|link|profile|play|rank|leaderboard|server|help|achievements`) — 상시 구동 봇 데몬 없이 Ed25519 서명 검증만으로 동작
- Arcane 스타일 랭크 카드 이미지 렌더링(satori + resvg, Cloudflare Workers에서 실행) — `/owogg profile`, `/owogg rank` 임베드에 첨부
- 서버 등록 시스템 — `MANAGE_GUILD` 권한 검증 후 등록, 공개 디렉토리(`/discord/servers`) 및 서버별 페이지 제공, 길드 단위 XP는 글로벌 XP와 분리
- 자세한 내용은 `docs/DISCORD_INTEGRATION.md`, `docs/DISCORD_BOT_GUIDE.md` 참고

**크리에이터 & Featured**

YouTube/CHZZK/SOOP/Twitch 공식 소유권 검증, Featured 자격 자동 심사 및 14일 재검증, 관리자 수동 심사 큐. Featured는 게임 점수·XP·랭킹에 영향을 주지 않습니다. 자세한 내용은 `docs/CREATOR_SYSTEM.md` 참고.

**Admin Center & 권한 모델 (RBAC)**

`ADMIN_USER_IDS`(근본 자격) + Google Step-Up 본인 확인 + 관리자 전용 로그인을 모두 통과해야 별도 관리자 세션이 발급되는 다층 인증 구조. 로그인 실패는 rate limit으로 보호되며, 관리자 페이지는 검색 색인에서 제외됩니다. 설정 절차는 `docs/ADMIN_GUIDE.md` 참고.

인가(authorization)는 세 개의 독립된 축으로 모델링됩니다 — **Staff Role**(ADMIN/OPERATOR/MODERATOR/SYSTEM_DEVELOPER, 운영 인력), **Program/Entitlement**(GAME_CREATOR/STREAMER, 특정 기능 승인 사용자), **Subscription**(OWO_PLUS, 향후 계획·미구현). GAME_CREATOR/STREAMER는 Staff Role의 하위 역할이 아닌 완전히 별개의 축입니다. 역할별 권한 카탈로그, Protected ADMIN 정책, `admin.center.access` 개별 위임, GAME_CREATOR 신청/승인 흐름 전체는 `docs/AUTHORIZATION.md` 참고.

**아키텍처**

- Game Plugin Architecture — 빌드 타임 이중 레지스트리 자동 생성(`pnpm generate:registry`)으로 새 게임 추가 시 중앙 로더 코드 수정 0회
- Clean Layered Monorepo — `packages/core`(Domain/Application/Ports), `packages/db`(Cloudflare D1 Persistence), `@owogg/contracts`(Zod 스키마 Single Source of Truth)
- CI Architecture Guard(`pnpm architecture:check`, `pnpm registry:check`)로 레이어 위반과 생성 파일 이탈을 자동 차단
- Cloudflare Free Tier 위에서 동작 — Hono + Workers(API), D1(DB), Workers Static Assets(웹). Repository Abstraction을 통해 Node.js + Docker + PostgreSQL로의 이관 경로도 고려되어 있습니다.

---

## 로컬 실행

### 사전 준비

- Node.js v22 LTS 이상
- pnpm v9 이상 (`npm install -g pnpm`)

### 설치 및 실행

```bash
pnpm install
pnpm dev
```

특정 앱만 실행하려면:

```bash
pnpm --filter @owogg/web dev   # 웹 프론트엔드
pnpm --filter @owogg/api dev   # API 백엔드
```

브라우저에서 [http://localhost:5173](http://localhost:5173) 접속.

---

## 스크립트

```bash
pnpm verify              # 단일 통합 품질 게이트 (포맷/아키텍처/레지스트리/린트/타입/테스트/빌드)
pnpm smoke:prod          # 프로덕션 상태 및 배포 SHA 검증
pnpm auth:prod:check     # 프로덕션 소셜 로그인 설정 진단

pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build

pnpm architecture:check  # 레이어 경계 검사
pnpm registry:check      # 게임 레지스트리 최신성 검사
pnpm generate:registry   # 게임 레지스트리 자동 생성
pnpm generate:favicon    # 파비콘/아이콘 자산 결정론적 생성
pnpm generate:game <slug>  # 새 게임 스캐폴딩 생성

pnpm admin:password:hash # 관리자 비밀번호 PBKDF2 레코드 생성 (평문은 stdin으로만 입력)
```

---

## 기술 스택

| 영역        | 스택                                                           |
| ----------- | -------------------------------------------------------------- |
| Frontend    | React 19, React Router v7 (SPA Mode), Tailwind CSS v4          |
| Backend     | Hono, TypeScript, Zod                                          |
| Database    | Cloudflare D1 (Repository Abstraction Layer)                   |
| Auth        | Google OAuth (GIS), Discord OAuth 2.0, HttpOnly Cookie Session |
| 이미지 렌더 | satori + @resvg/resvg-wasm (Discord 랭크 카드)                 |
| Runtime     | Cloudflare Workers, Workers Static Assets                      |
| CI/CD       | GitHub Actions, Wrangler CLI                                   |
| Monorepo    | pnpm workspaces, Turborepo                                     |

---

## 프로젝트 구조

```text
owogg/
├── apps/
│   ├── web/                       # React Router v7 SPA 프론트엔드
│   └── api/                       # Hono API 백엔드 (Workers / Node.js portable)
├── games/
│   ├── reaction-time/             # @owogg/game-reaction-time
│   ├── memory-test/                # @owogg/game-memory-test
│   ├── aim-test/                   # @owogg/game-aim-test
│   └── typing-test/                # @owogg/game-typing-test
├── packages/
│   ├── contracts/                 # Zod 요청/응답 스키마 (API Single Source of Truth)
│   ├── core/                      # Domain, Application Use Cases, Ports
│   ├── db/                        # Cloudflare D1 Repository 구현체 & SQL 스키마
│   ├── game-sdk/                  # 게임 모듈 공통 계약 & 스코어링 인터페이스
│   ├── shared/                    # 공통 Zod 검증 스키마 & 타입
│   └── ui/                        # 공통 UI 컴포넌트 & GameShell
├── scripts/                       # Architecture Guard, Registry Generator, 빌드 스크립트
└── docs/
    ├── ARCHITECTURE.md            # 레이어 의존성 & 플러그인 아키텍처
    ├── WORK_PROGRESS.md           # 현재 작업 현황 및 대기 백로그
    ├── GAME_CREATION_GUIDE.md     # 게임 제작/등록 지침 및 메타데이터 규격
    ├── GAME_UPLOAD_GUIDE.md       # 게임 크리에이터(GAME_CREATOR) 실사용 업로드 가이드
    ├── GAME_LINEUP.md             # 신규 게임 라인업 및 기획 명세서
    ├── PROGRESSION.md             # XP/레벨/도전과제 설계
    ├── CREATOR_SYSTEM.md          # 크리에이터(STREAMER) 인증 & Featured 정책
    ├── DISCORD_INTEGRATION.md     # Discord HTTP Interactions 아키텍처
    ├── DISCORD_BOT_GUIDE.md       # Discord 봇 실무 가이드
    ├── ADMIN_GUIDE.md             # Admin Center 인증(다층 Step-Up) 및 운영 가이드
    ├── AUTHORIZATION.md           # Staff Role/권한/Program(GAME_CREATOR·STREAMER)/구독 모델
    ├── DATABASE.md                # D1 스키마 전체 및 ERD
    ├── PRODUCTION_INTEGRATIONS.md # 외부 연동 운영 설정 체크리스트
    ├── I18N.md                    # 다국어(4개 언어) 콘텐츠 관리
    ├── MULTIPLAYER_GAME_DESIGN.md # 1:1 실시간 대전 설계 (계획 단계)
    ├── ROADMAP.md                 # 향후 로드맵
    ├── AGENTS.md                  # AI Agent 개발 규칙
    ├── logs/                      # 세션 작업 로그 및 아카이브
    └── runbooks/
        ├── oauth-setup.md         # 소셜 로그인 설정 런북
        └── account-linking.md     # 계정 연결/통합 런북
```

---

## 배포 파이프라인

```text
git push origin main
  └─ GitHub Actions CI  (frozen install → format → lint → architecture → registry → typecheck → test → build)
        └─ GitHub Actions CD  (D1 Migration → API Worker 배포 → API Health Check → Web 배포 → Web Smoke Check → Provenance Check)
```

GitHub Actions와 Wrangler CLI를 통해 Cloudflare Workers에 자동 배포됩니다.

---

## 라이선스

MIT License
