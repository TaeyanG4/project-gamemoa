# Claude Code Instructions

Claude Code는 작업을 시작하기 전에 루트 [`AGENTS.md`](AGENTS.md)와
[`docs/STAGING.md`](docs/STAGING.md), [`docs/BRANCH_MANAGEMENT.md`](docs/BRANCH_MANAGEMENT.md)를 반드시
읽고 준수합니다. 로컬에 `docs/AGENTS.md`가 있으면 아키텍처·코딩 보충 규칙도 함께 확인합니다.

이 저장소는 **Staging-first**입니다. 기능을 Production `main`에서 직접 구축하거나, Staging 검증과
릴리스별 명시적 승인 없이 Production으로 배포하지 않습니다. 로컬 검증 → Staging 배포 → 자동·수동
검증 → 승인 → 동일 tree의 Production 승격 → Production smoke 순서를 지킵니다.

일반 기능은 최신 `staging`에서 `feature/*`, 버그 수정은 `fix/*` 브랜치를 만듭니다. 작업과 로컬
테스트 후 첫 병합 대상은 `staging`이며, `https://stg.owogg.com/`에서 실제 통합 테스트를 수행합니다.
문제가 발견되면 수정본을 `staging`에 재배포하고 전체 검증을 반복합니다. 검증 완료와 릴리스별 명시적
승인 후에만 `staging → main` PR로 동일 tree를 승격합니다. 작업 브랜치에서 `main`으로 직접 PR을
만들지 않습니다.

Production 검증 뒤에는 `pnpm branches:audit`으로 local/remote 브랜치를 `삭제 가능 / 보존 필요 /
애매함`으로 분류합니다. 분류 결과는 삭제 승인이 아니므로 정확한 대상에 대한 사용자 승인 없이
branch나 worktree metadata를 삭제하지 않습니다. 세부 기준과 정리 순서는
[`docs/BRANCH_MANAGEMENT.md`](docs/BRANCH_MANAGEMENT.md)를 따릅니다.

게임 catalog·플레이·점수·공식 표시는 generic D1/B2만 사용합니다. `games/*` workspace나 Git deploy
bootstrap을 게임 등록 또는 fallback으로 복원하지 않습니다. 관리자 센터의 단일 **게임 관리 및
심사** 화면(`/admin/games`)에서 OWOGG 업로드, 전체 게임 안전 제어, 사용자 제작 게임 심사를
처리합니다. 관리자 ZIP 업로드는 Game Creator Center와 같은 standalone ZIP/drag-and-drop 입력을
공유하지만 publisher는 서버가 `OWOGG`로 고정합니다. Game Creator 업로드는 인증된 사용자 identity를
소유자로 저장하여 공개 제작자명에 사용자 닉네임을 사용합니다. `/admin/sandbox-games`는 예전 북마크
호환용이며 새 링크를 만들지 않습니다. Git 기반 `game-registry`와 생성 manifest/definition은
제거되었으며 모든 게임 소비자는 D1/B2 기반 public game API를 사용합니다.

Claude는 CI 성공이나 로컬 검증을 `Staging 배포 완료`라고 부르지 않습니다. 실제
`https://stg.owogg.com/`에서 권한 있는 사용자가 브라우저 테스트를 할 수 있고, API health와 배포 SHA가
확인된 경우에만 `Staging 배포 완료(테스트 가능)`로 보고합니다. 이후 기능 acceptance까지 통과해야
`Staging 검증 완료(Production 승격 대기)`입니다.

추적 가능한 정책의 단일 진실 공급원은 루트 `AGENTS.md`와 `docs/STAGING.md`이며, 이 파일은 Claude의
자동 발견을 위한 진입점입니다.
