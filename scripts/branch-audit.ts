import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export type BranchClassification = "삭제 가능" | "보존 필요" | "애매함";

export interface PullRequestEvidence {
  number: number;
  state: "OPEN" | "CLOSED" | "MERGED";
  headRefName: string;
  headRefOid: string;
  baseRefName: string;
  isDraft: boolean;
  url: string;
}

export interface BranchClassificationInput {
  name: string;
  protectedBranch: boolean;
  currentBranch: boolean;
  activeWorktrees: string[];
  prunableWorktrees: string[];
  localSha?: string;
  remoteSha?: string;
  localIntegrated: boolean;
  remoteIntegrated: boolean;
  pullRequests: PullRequestEvidence[];
  integrationRefsAvailable: boolean;
}

export interface BranchDecision {
  classification: BranchClassification;
  reasons: string[];
}

interface RefRecord {
  name: string;
  sha: string;
  committedAt: string;
}

interface WorktreeRecord {
  path: string;
  branch?: string;
  prunable: boolean;
}

interface CommandResult {
  status: number;
  stdout: string;
  stderr: string;
}

export interface BranchAuditRecord extends BranchDecision {
  name: string;
  local?: RefRecord;
  remote?: RefRecord;
  activeWorktrees: string[];
  prunableWorktrees: string[];
  pullRequests: PullRequestEvidence[];
}

const PROTECTED_BRANCHES = new Set(["main", "staging"]);

function uniqueTips(input: BranchClassificationInput): string[] {
  return [...new Set([input.localSha, input.remoteSha].filter((sha): sha is string => !!sha))];
}

export function classifyBranch(input: BranchClassificationInput): BranchDecision {
  if (input.protectedBranch) {
    return { classification: "보존 필요", reasons: ["보호 브랜치"] };
  }
  if (input.currentBranch) {
    return { classification: "보존 필요", reasons: ["현재 checkout된 브랜치"] };
  }
  if (input.activeWorktrees.length > 0) {
    return {
      classification: "보존 필요",
      reasons: [`활성 worktree에서 사용 중: ${input.activeWorktrees.join(", ")}`],
    };
  }

  const openPullRequests = input.pullRequests.filter((pullRequest) => pullRequest.state === "OPEN");
  if (openPullRequests.length > 0) {
    return {
      classification: "보존 필요",
      reasons: [
        `열린 PR: ${openPullRequests.map((pullRequest) => `#${pullRequest.number}`).join(", ")}`,
      ],
    };
  }

  if (input.prunableWorktrees.length > 0) {
    return {
      classification: "애매함",
      reasons: [
        `사라진 경로를 가리키는 worktree metadata가 남음: ${input.prunableWorktrees.join(", ")}`,
      ],
    };
  }

  if (!input.integrationRefsAvailable) {
    return {
      classification: "애매함",
      reasons: ["origin/main 또는 origin/staging 기준 ref를 확인할 수 없음"],
    };
  }

  const tips = uniqueTips(input);
  const mergedHeadOids = new Set(
    input.pullRequests
      .filter((pullRequest) => pullRequest.state === "MERGED")
      .map((pullRequest) => pullRequest.headRefOid),
  );
  const integratedTips = new Set<string>();
  if (input.localSha && input.localIntegrated) integratedTips.add(input.localSha);
  if (input.remoteSha && input.remoteIntegrated) integratedTips.add(input.remoteSha);
  const everyTipAccountedFor = tips.every(
    (sha) => integratedTips.has(sha) || mergedHeadOids.has(sha),
  );

  if (tips.length > 0 && everyTipAccountedFor) {
    const reasons: string[] = [];
    if (tips.every((sha) => integratedTips.has(sha))) {
      reasons.push("모든 현재 tip이 origin/main 또는 origin/staging에 포함됨");
    } else {
      const merged = input.pullRequests
        .filter(
          (pullRequest) => pullRequest.state === "MERGED" && tips.includes(pullRequest.headRefOid),
        )
        .map((pullRequest) => `#${pullRequest.number}`);
      reasons.push(`현재 tip과 정확히 일치하는 merged PR 확인: ${merged.join(", ")}`);
    }
    return { classification: "삭제 가능", reasons };
  }

  const closedPullRequests = input.pullRequests.filter(
    (pullRequest) => pullRequest.state === "CLOSED",
  );
  if (closedPullRequests.length > 0) {
    return {
      classification: "애매함",
      reasons: [
        `merge되지 않고 닫힌 PR: ${closedPullRequests
          .map((pullRequest) => `#${pullRequest.number}`)
          .join(", ")}`,
        "현재 tip에 통합되지 않은 commit이 남아 있음",
      ],
    };
  }

  const mergedPullRequests = input.pullRequests.filter(
    (pullRequest) => pullRequest.state === "MERGED",
  );
  if (mergedPullRequests.length > 0) {
    return {
      classification: "보존 필요",
      reasons: [
        `merged PR 이후 현재 tip이 변경됨: ${mergedPullRequests
          .map((pullRequest) => `#${pullRequest.number}`)
          .join(", ")}`,
        "통합되지 않은 후속 commit 보존 필요",
      ],
    };
  }

  return {
    classification: "보존 필요",
    reasons: ["origin/main·origin/staging에 포함되지 않은 고유 commit 보존 필요"],
  };
}

function run(command: string, args: string[], cwd: string): CommandResult {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", windowsHide: true });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? result.error?.message ?? "",
  };
}

function git(repositoryRoot: string, args: string[], allowFailure = false): CommandResult {
  const safeDirectory = repositoryRoot.split(path.sep).join("/");
  const result = run("git", ["-c", `safe.directory=${safeDirectory}`, ...args], repositoryRoot);
  if (!allowFailure && result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
  }
  return result;
}

function parseRefs(repositoryRoot: string, namespace: "local" | "remote"): RefRecord[] {
  const prefix = namespace === "local" ? "refs/heads" : "refs/remotes/origin";
  const result = git(repositoryRoot, [
    "for-each-ref",
    "--format=%(refname:short)\t%(objectname)\t%(committerdate:iso8601-strict)",
    prefix,
  ]);

  return result.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [rawName, sha, committedAt] = line.split("\t");
      if (!rawName || !sha || !committedAt) {
        throw new Error(`Unexpected git ref record: ${line}`);
      }
      const name = namespace === "remote" ? rawName.replace(/^origin\//, "") : rawName;
      return { name, sha, committedAt };
    })
    .filter((record) => record.name !== "HEAD");
}

function parseWorktrees(repositoryRoot: string): WorktreeRecord[] {
  const output = git(repositoryRoot, ["worktree", "list", "--porcelain"]).stdout;
  return output
    .trim()
    .split(/(?:\r?\n){2,}/)
    .filter(Boolean)
    .map((block) => {
      const lines = block.split(/\r?\n/);
      const worktreePath = lines.find((line) => line.startsWith("worktree "))?.slice(9);
      if (!worktreePath) throw new Error(`Unexpected worktree record: ${block}`);
      const branch = lines
        .find((line) => line.startsWith("branch refs/heads/"))
        ?.slice("branch refs/heads/".length);
      return {
        path: worktreePath,
        prunable: lines.some((line) => line.startsWith("prunable")),
        ...(branch ? { branch } : {}),
      };
    });
}

function readPullRequests(repositoryRoot: string): {
  available: boolean;
  pullRequests: PullRequestEvidence[];
  warning?: string;
} {
  const result = run(
    "gh",
    [
      "pr",
      "list",
      "--state",
      "all",
      "--limit",
      "1000",
      "--json",
      "number,state,isDraft,headRefName,baseRefName,headRefOid,url",
    ],
    repositoryRoot,
  );
  if (result.status !== 0) {
    return {
      available: false,
      pullRequests: [],
      warning: `GitHub PR 조회 실패: ${result.stderr.trim() || "gh command unavailable"}`,
    };
  }
  try {
    return { available: true, pullRequests: JSON.parse(result.stdout) as PullRequestEvidence[] };
  } catch (error) {
    return {
      available: false,
      pullRequests: [],
      warning: `GitHub PR JSON 해석 실패: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function resolveIntegrationRefs(repositoryRoot: string): string[] {
  const candidates = ["refs/remotes/origin/main", "refs/remotes/origin/staging"];
  return candidates.filter(
    (reference) =>
      git(repositoryRoot, ["show-ref", "--verify", "--quiet", reference], true).status === 0,
  );
}

function isIntegrated(repositoryRoot: string, sha: string, targets: string[]): boolean {
  return targets.some(
    (target) =>
      git(repositoryRoot, ["merge-base", "--is-ancestor", sha, target], true).status === 0,
  );
}

export function auditBranches(repositoryRoot = process.cwd()): {
  records: BranchAuditRecord[];
  warnings: string[];
} {
  git(repositoryRoot, ["rev-parse", "--git-dir"]);
  const locals = parseRefs(repositoryRoot, "local");
  const remotes = parseRefs(repositoryRoot, "remote");
  const worktrees = parseWorktrees(repositoryRoot);
  const integrationRefs = resolveIntegrationRefs(repositoryRoot);
  const pullRequestResult = readPullRequests(repositoryRoot);
  const currentBranch = git(repositoryRoot, ["branch", "--show-current"]).stdout.trim();
  const names = [
    ...new Set([...locals.map(({ name }) => name), ...remotes.map(({ name }) => name)]),
  ]
    .filter(
      (name) =>
        name !== "main" || locals.some((branch) => branch.name === name) || remotes.length > 0,
    )
    .sort((left, right) => left.localeCompare(right, "en"));

  const records = names.map((name): BranchAuditRecord => {
    const local = locals.find((record) => record.name === name);
    const remote = remotes.find((record) => record.name === name);
    const matchingWorktrees = worktrees.filter((worktree) => worktree.branch === name);
    const activeWorktrees = matchingWorktrees
      .filter((worktree) => !worktree.prunable)
      .map((worktree) => worktree.path);
    const prunableWorktrees = matchingWorktrees
      .filter((worktree) => worktree.prunable)
      .map((worktree) => worktree.path);
    const pullRequests = pullRequestResult.pullRequests.filter(
      (pullRequest) => pullRequest.headRefName === name,
    );
    const input: BranchClassificationInput = {
      name,
      protectedBranch: PROTECTED_BRANCHES.has(name),
      currentBranch: name === currentBranch,
      activeWorktrees,
      prunableWorktrees,
      ...(local ? { localSha: local.sha } : {}),
      ...(remote ? { remoteSha: remote.sha } : {}),
      localIntegrated: local ? isIntegrated(repositoryRoot, local.sha, integrationRefs) : false,
      remoteIntegrated: remote ? isIntegrated(repositoryRoot, remote.sha, integrationRefs) : false,
      pullRequests,
      integrationRefsAvailable: integrationRefs.length === 2,
    };
    return {
      name,
      ...(local ? { local } : {}),
      ...(remote ? { remote } : {}),
      activeWorktrees,
      prunableWorktrees,
      pullRequests,
      ...classifyBranch(input),
    };
  });

  const warnings = pullRequestResult.warning ? [pullRequestResult.warning] : [];
  if (!pullRequestResult.available) {
    warnings.push(
      "PR 증거 없이 squash/rebase merge를 삭제 가능으로 확정하지 않습니다. gh 인증 후 다시 실행하세요.",
    );
  }
  return { records, warnings };
}

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function renderMarkdown(records: BranchAuditRecord[], warnings: string[]): string {
  const counts = new Map<BranchClassification, number>([
    ["삭제 가능", 0],
    ["보존 필요", 0],
    ["애매함", 0],
  ]);
  for (const record of records) {
    counts.set(record.classification, (counts.get(record.classification) ?? 0) + 1);
  }

  const lines = [
    `브랜치 감사 결과: 삭제 가능 ${counts.get("삭제 가능")} / 보존 필요 ${counts.get("보존 필요")} / 애매함 ${counts.get("애매함")}`,
    "",
  ];
  for (const warning of warnings) lines.push(`경고: ${warning}`);
  if (warnings.length > 0) lines.push("");
  lines.push("| 분류 | 브랜치 | 위치 | 근거 |", "| --- | --- | --- | --- |");
  for (const record of records) {
    const locations = [record.local ? "local" : "", record.remote ? "origin" : ""]
      .filter(Boolean)
      .join("+");
    lines.push(
      `| ${record.classification} | \`${escapeCell(record.name)}\` | ${locations} | ${escapeCell(record.reasons.join("; "))} |`,
    );
  }
  lines.push(
    "",
    "이 명령은 조사·분류만 수행하며 브랜치를 삭제하지 않습니다. 삭제 가능 항목도 실제 삭제 직전에 다시 감사하고 명시적으로 검토하세요.",
  );
  return lines.join("\n");
}

function main(): void {
  const repositoryRoot = process.cwd();
  const result = auditBranches(repositoryRoot);
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderMarkdown(result.records, result.warnings));
  }
}

const invokedScript = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : undefined;
if (invokedScript === import.meta.url) {
  main();
}
