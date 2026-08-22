import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyBranch,
  type BranchClassificationInput,
  type PullRequestEvidence,
} from "./branch-audit.js";

const SHA = "a".repeat(40);

function mergedPullRequest(overrides: Partial<PullRequestEvidence> = {}): PullRequestEvidence {
  return {
    number: 10,
    state: "MERGED",
    headRefName: "feature/example",
    headRefOid: SHA,
    baseRefName: "staging",
    isDraft: false,
    url: "https://github.com/example/repository/pull/10",
    ...overrides,
  };
}

function input(overrides: Partial<BranchClassificationInput> = {}): BranchClassificationInput {
  return {
    name: "feature/example",
    protectedBranch: false,
    currentBranch: false,
    activeWorktrees: [],
    prunableWorktrees: [],
    localSha: SHA,
    remoteSha: SHA,
    localIntegrated: false,
    remoteIntegrated: false,
    pullRequests: [],
    integrationRefsAvailable: true,
    ...overrides,
  };
}

test("보호·현재·활성 worktree·open PR 브랜치는 보존한다", () => {
  assert.equal(classifyBranch(input({ protectedBranch: true })).classification, "보존 필요");
  assert.equal(classifyBranch(input({ currentBranch: true })).classification, "보존 필요");
  assert.equal(
    classifyBranch(input({ activeWorktrees: ["/workspace/feature"] })).classification,
    "보존 필요",
  );
  assert.equal(
    classifyBranch(input({ pullRequests: [mergedPullRequest({ state: "OPEN", isDraft: true })] }))
      .classification,
    "보존 필요",
  );
});

test("main 또는 staging에 포함된 모든 tip은 삭제 가능하다", () => {
  assert.equal(
    classifyBranch(input({ localIntegrated: true, remoteIntegrated: true })).classification,
    "삭제 가능",
  );
});

test("squash merge도 현재 tip과 merged PR head SHA가 정확히 같으면 삭제 가능하다", () => {
  assert.equal(
    classifyBranch(input({ pullRequests: [mergedPullRequest()] })).classification,
    "삭제 가능",
  );
});

test("merged PR 이후 branch가 전진했다면 후속 commit을 보존한다", () => {
  const advancedSha = "b".repeat(40);
  const decision = classifyBranch(
    input({ localSha: advancedSha, remoteSha: advancedSha, pullRequests: [mergedPullRequest()] }),
  );
  assert.equal(decision.classification, "보존 필요");
  assert.match(decision.reasons.join("\n"), /후속 commit/);
});

test("merge되지 않고 닫힌 PR과 prunable worktree는 자동 삭제하지 않는다", () => {
  assert.equal(
    classifyBranch(input({ pullRequests: [mergedPullRequest({ state: "CLOSED" })] }))
      .classification,
    "애매함",
  );
  assert.equal(
    classifyBranch(input({ prunableWorktrees: ["/missing/worktree"] })).classification,
    "애매함",
  );
});

test("통합 기준 ref가 없으면 판정을 보류한다", () => {
  assert.equal(classifyBranch(input({ integrationRefsAvailable: false })).classification, "애매함");
});

test("PR도 통합 증거도 없는 고유 commit은 보존한다", () => {
  assert.equal(classifyBranch(input()).classification, "보존 필요");
});
