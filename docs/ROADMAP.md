# GAMEMOA 향후 로드맵 (ROADMAP)

GAMEMOA는 높은 모듈성과 플러그 앤 플레이(Plug-and-Play) 게임 아키텍처 기반으로 설계된 미니게임 플랫폼입니다.  
2차 아키텍처 안정화 및 게임 플러그인 이중 레지스트리 자동화 구축이 완료됨에 따라, 향후 플랫폼 확장 및 신규 게임 추가가 효율적으로 진행됩니다.

---

## 🎯 1. 단기 로드맵 (Now / Next Sprint)

### 1) 신규 테스트 미니게임 확충

`pnpm generate:game <slug>` 명령어를 통한 게임 카탈로그 확장:

- ⌨️ **타자 속도 테스트 (typing-test)**: 타자 속도(WPM / CPM) 및 정확도 측정.
- 🎨 **색각 이상 테스트 (color-test)**: 제한 시간 내 다른 색상 타일 찾기.
- 🖐️ **CPS 테스트 (cps-test)**: 10초간 초당 클릭 횟수 측정.

### 2) 사용자 경험(UX) 고도화

- **다크 모드 / 테마 스위처**: Tailwind CSS v4 토큰을 활용한 부드러운 테마 전환.
- **음향 효과 온/오프 (Sound Effects)**: 게임 클릭, 완료, 재도전 시 Web Audio 효과음 선택 기능.

---

## 🚀 2. 중기 로드맵 (Next / Quarterly)

### 1) 소셜 및 사용자 참여 (Social & Engagement)

- **개인 최고 기록 점수 카탈로그 카드**: 개인 기록을 오프라인 Canvas 이미지로 다운로드하거나 SNS로 공유하는 기능.
- **주간 랭킹 리셋 & 배지 시스템**: 주간 단위 랭킹 리셋 및 업적 달성 배지 부여.

---

## 🔮 3. 장기 로드맵 (Later / Long-Term)

### 1) 실시간 멀티플레이어 (Realtime Multiplayer)

- Cloudflare Durable Objects 및 WebSockets 기반 1v1 반응속도 및 에임 대전방 구축 검토.

---

## ☁️ 4. Cloudflare 이탈 전략 (Exit Strategy)

GAMEMOA 아키텍처는 인프라 독립성을 100% 보장합니다:

- **API 엔진**: `@gamemoa/api` (Hono 기반)는 Cloudflare Workers뿐만 아니라 Node.js (`@hono/node-server`), Bun, Deno, Docker 컨테이너 환경에서 수정 없이 동작합니다.
- **영속성 어댑터**: `packages/core`의 포트 인터페이스 (`ScoreRepository`, `UserRepository`, `SessionRepository`)를 따르므로, Cloudflare D1 대신 PostgreSQL/MySQL ORM 어댑터로 교체하더라도 도메인 비즈니스 로직은 영향을 받지 않습니다.
