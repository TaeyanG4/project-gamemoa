# Claude Code Instructions

Claude Code는 작업을 시작하기 전에 루트 [`AGENTS.md`](AGENTS.md)와
[`docs/STAGING.md`](docs/STAGING.md)를 반드시 읽고 준수합니다. 로컬에 `docs/AGENTS.md`가 있으면
아키텍처·코딩 보충 규칙도 함께 확인합니다.

이 저장소는 **Staging-first**입니다. 기능을 Production `main`에서 직접 구축하거나, Staging 검증과
릴리스별 명시적 승인 없이 Production으로 배포하지 않습니다. 로컬 검증 → Staging 배포 → 자동·수동
검증 → 승인 → 동일 tree의 Production 승격 → Production smoke 순서를 지킵니다.

Claude는 CI 성공이나 로컬 검증을 `Staging 배포 완료`라고 부르지 않습니다. 실제
`https://stg.owogg.com/`에서 권한 있는 사용자가 브라우저 테스트를 할 수 있고, API health와 배포 SHA가
확인된 경우에만 `Staging 배포 완료(테스트 가능)`로 보고합니다. 이후 기능 acceptance까지 통과해야
`Staging 검증 완료(Production 승격 대기)`입니다.

추적 가능한 정책의 단일 진실 공급원은 루트 `AGENTS.md`와 `docs/STAGING.md`이며, 이 파일은 Claude의
자동 발견을 위한 진입점입니다.
