# 브랜치 감사 및 정리 런북

이 문서는 OwOGG의 로컬·원격 작업 브랜치를 자동 조사하고 `삭제 가능`, `보존 필요`, `애매함`으로
분류한 뒤 안전하게 정리하는 기준입니다. 브랜치가 오래되었다는 이유만으로 삭제하지 않으며, commit
도달 가능성, GitHub PR 상태, worktree 사용 여부를 실제로 확인합니다.

## 1. 자동 감사

원격 상태를 최신화한 뒤 감사 명령을 실행합니다.

```bash
git fetch origin
pnpm branches:audit
```

기계가 읽을 JSON이 필요하면 다음 명령을 사용합니다.

```bash
pnpm branches:audit -- --json
```

감사기는 다음 증거를 함께 조사합니다.

- 로컬 브랜치와 `origin/*` remote-tracking branch의 현재 tip SHA
- `origin/main`, `origin/staging`에 대한 commit 도달 가능성
- 현재 checkout 브랜치와 모든 활성·prunable Git worktree
- `gh pr list`로 확인한 open, merged, closed PR과 PR head SHA
- 로컬과 원격의 tip 불일치 및 merged PR 이후 추가 commit 여부

`gh`가 설치되지 않았거나 인증·네트워크 문제로 PR을 조회하지 못하면 squash/rebase merge를 PR
증거만으로 삭제 가능하다고 판정하지 않습니다. 오류를 해결하고 다시 실행합니다.

## 2. 분류 기준

### 삭제 가능

다음 조건을 모두 만족할 때만 `삭제 가능`입니다.

1. `main`, `staging` 보호 브랜치가 아닙니다.
2. 현재 checkout 또는 활성/prunable worktree에서 사용 중이지 않습니다.
3. open PR이 없습니다.
4. 존재하는 로컬·원격 tip이 모두 `origin/main` 또는 `origin/staging`에 포함되어 있거나, 현재 tip SHA와
   정확히 같은 head SHA의 merged PR이 확인됩니다.

Squash merge는 작업 브랜치 commit이 대상 브랜치의 ancestor가 아닐 수 있으므로 merged PR 이름만
보고 삭제하지 않습니다. 현재 branch tip과 GitHub가 기록한 merged PR head SHA가 정확히 같아야 합니다.

### 보존 필요

다음 중 하나라도 해당하면 `보존 필요`입니다.

- `main` 또는 `staging` 보호 브랜치
- 현재 checkout 또는 활성 worktree에서 사용하는 브랜치
- open/draft PR의 head 브랜치
- `main`·`staging` 어느 쪽에도 포함되지 않은 고유 commit이 있는 브랜치
- merged PR 이후 새 commit이 추가된 브랜치

이 분류는 브랜치의 작업이 유효하다는 제품 판단이 아니라, 아직 Git에서 안전하게 버릴 수 없다는
뜻입니다. 필요 없다고 판단하더라도 담당자 확인 없이 삭제하지 않습니다.

### 애매함

다음 상태는 자동 삭제하지 않고 사람이 먼저 해소합니다.

- 사라진 디렉터리를 가리키는 prunable worktree metadata가 남아 있음
- PR이 merge되지 않은 채 닫혔고 현재 tip에 통합되지 않은 commit이 있음
- `origin/main` 또는 `origin/staging` 기준 ref를 확인할 수 없음
- PR 상태, branch tip 또는 보존 의도를 서로 모순 없이 확정할 수 없음

## 3. 정리 절차

브랜치 정리는 Production 배포와 검증이 끝난 뒤 수행합니다. Staging 검증 중인 브랜치를 먼저
삭제하지 않습니다.

1. `git fetch origin`과 `pnpm branches:audit`를 다시 실행합니다.
2. `보존 필요`는 유지하고 `애매함`은 담당자·PR·worktree 상태를 확인할 때까지 건드리지 않습니다.
3. prunable worktree가 있으면 `git worktree prune --dry-run` 결과와 해당 경로가 실제로 사라졌는지
   확인한 뒤 별도 승인을 받아 metadata를 정리하고 감사를 다시 실행합니다.
4. `삭제 가능` 중 정확한 대상 이름을 검토합니다. 감사 결과는 삭제 권한이 아니라 후보 증거입니다.
5. 로컬 브랜치는 우선 `git branch -d <branch>`를 사용합니다. Squash merge 때문에 `-d`가 거부되는
   경우에만 현재 tip과 merged PR head SHA 일치를 재확인하고 승인 후 `git branch -D <branch>`를
   사용합니다.
6. 원격 브랜치는 해당 이름의 open PR이 여전히 없는지 다시 확인하고 승인 후
   `git push origin --delete <branch>`로 하나씩 삭제합니다.
7. `git fetch origin`과 `pnpm branches:audit`를 다시 실행하여 남은 브랜치와 분류를 기록합니다.

감사 스크립트는 의도적으로 브랜치를 직접 삭제하지 않습니다. 자동 분류 오류가 원격 commit을
영구적으로 숨기는 것을 막기 위해 삭제는 정확한 이름을 명시한 별도 명령과 현재 작업의 승인으로만
수행합니다. `main`, `staging`, 현재 브랜치, active/prunable worktree 브랜치는 삭제 명령 대상에 넣지
않습니다.

## 4. 에이전트 작업 규칙

Codex·Claude를 포함한 에이전트는 다음을 지킵니다.

- 기능 구현 요청이나 Production 승격 승인을 브랜치 삭제 승인으로 확대 해석하지 않습니다.
- Production 배포·smoke가 완료되면 branch audit을 실행해 세 분류와 근거를 보고합니다.
- 사용자가 정확한 삭제 범위를 승인하기 전에는 local/remote branch 또는 worktree metadata를
  삭제하지 않습니다.
- 삭제 후에는 다시 감사하여 실제로 삭제된 대상과 남겨둔 `보존 필요`·`애매함` 대상을 보고합니다.
