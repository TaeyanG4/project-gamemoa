# OwOGG Agent Instructions

이 파일은 저장소 루트에서 작업하는 Codex 및 기타 AI 코딩 에이전트가 가장 먼저 읽어야 하는
진입점입니다.

작업을 시작하기 전에 반드시 다음 문서를 읽고 준수합니다.

1. 이 파일 전체 — 저장소에 추적되는 AI Agent 강제 규칙
2. [`docs/STAGING.md`](docs/STAGING.md) — 격리된 Staging 구성과 승격 절차

로컬에 `docs/AGENTS.md`가 있으면 아키텍처·코딩 세부 규칙도 함께 따릅니다. 이 파일은 public
repository에 포함되지 않는 로컬 보충 문서이므로, 배포 안전 정책은 이 루트 파일과 `docs/STAGING.md`
만 읽어도 완전하게 이해할 수 있어야 합니다.

가장 중요한 배포 원칙은 다음과 같습니다.

- 모든 기능, 버그 수정, DB migration, 인프라 변경은 **Staging-first**로 진행합니다.
- 일반 작업의 기준 브랜치와 최초 병합 대상은 `staging`입니다. Production `main`에서 직접 기능을
  구축하지 않습니다.
- 로컬 `pnpm verify` 성공은 구현 완료일 뿐, 배포 완료가 아닙니다.
- `Staging 배포 완료`는 CI/CD 성공만 뜻하지 않습니다. `https://stg.owogg.com/`이 실제로 DNS/HTTPS와
  Access를 거쳐 열리고, API health와 배포 SHA가 대상 commit과 일치해 사용자가 브라우저에서 테스트할
  수 있을 때만 사용합니다.
- Staging smoke와 기능별 수동 검증을 통과한 동일한 tree만 Production 후보가 됩니다.
- 에이전트는 현재 작업에서 사용자가 명시적으로 Production 승격을 승인하지 않은 한 `main` push,
  Production 배포·D1 migration·secret 변경, Discord global command sync를 실행하지 않습니다.
- Staging 검증 뒤 코드나 설정이 한 줄이라도 바뀌면 기존 승인은 무효이며 다시 Staging부터 검증합니다.
- 완료 보고는 `구현 완료(로컬 검증 완료)`, `Staging 배포 완료(테스트 가능)`,
  `Staging 검증 완료(Production 승격 대기)`, `Production 배포 완료`를 구분해 표현합니다.

## 필수 작업 흐름

1. 최신 `staging`을 기준으로 작업 브랜치를 만들고 로컬에서 구현합니다.
2. `pnpm format`, `pnpm verify`, `git status`, `git diff`를 확인합니다.
3. 허용된 경우에만 `staging` 대상으로 병합·push하여 Staging CI/CD를 실행합니다.
4. `stg.owogg.com`의 실제 브라우저 접속, API health, 배포 SHA를 확인한 뒤에만
   `Staging 배포 완료(테스트 가능)`로 보고합니다. DNS 미설정, Access 차단 오류, placeholder 페이지,
   CI-only 성공은 배포 완료가 아닙니다.
5. Staging에서 변경 기능 acceptance, D1/B2/OAuth/Discord 격리, Production 무변경을 확인합니다.
6. 대상 commit SHA/tree와 테스트 결과를 기록하고 `Staging 검증 완료(Production 승격 대기)`로
   보고합니다.
7. 릴리스별 명시적 승인을 받은 뒤에만 검증된 동일 tree를 `main`으로 승격합니다.
8. Production CI/CD, health, smoke, provenance를 확인한 뒤 `Production 배포 완료`로 보고합니다.

긴급 hotfix도 Staging-first가 원칙입니다. Staging 생략은 사용자가 위험을 인지하고 현재 릴리스에
대해 명시적으로 승인한 경우에만 허용하며, 직후 Staging 동기화와 회귀 검증을 남깁니다.

이 파일과 `docs/STAGING.md`가 배포 절차의 추적 가능한 단일 진실 공급원입니다.
