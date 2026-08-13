// Operator helper: derive an ADMIN_PASSWORD_PBKDF2 record from a password read on stdin.
//
// The password is NEVER accepted as a CLI argument (would leak into shell history/process
// list), never logged, and never written anywhere by this script — only the derived record is
// printed to stdout. Pipe it directly into the GitHub Actions Secret / Cloudflare Worker
// secret; do not paste the plaintext password anywhere else (including into an AI chat).
//
// Usage (password typed, not echoed):
//   pnpm admin:password:hash
//
// Usage (piped, e.g. from a local password manager CLI):
//   my-password-manager-cli show gamemoa-admin | pnpm admin:password:hash

import { hashAdminPassword } from "../apps/api/src/auth/adminPassword.js";

function readStdinPassword(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const isTty = process.stdin.isTTY;

    if (isTty) {
      process.stderr.write("Admin 비밀번호 입력 (입력은 화면에 표시되지 않습니다): ");
      try {
        // @ts-expect-error -- setRawMode only exists on TTY streams; guarded by isTTY above.
        process.stdin.setRawMode(true);
      } catch {
        // Fall through to plain (echoed) stdin if raw mode is unavailable.
      }
    }

    process.stdin.on("data", (chunk: Buffer) => {
      // Ctrl+C / Ctrl+D
      if (chunk.includes(0x03)) {
        process.stderr.write("\n취소되었습니다.\n");
        process.exit(1);
      }
      if (isTty && chunk.includes(0x0d)) {
        finish();
        return;
      }
      chunks.push(chunk);
    });

    process.stdin.on("end", finish);
    process.stdin.on("error", reject);

    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      if (isTty) {
        try {
          // @ts-expect-error -- see above.
          process.stdin.setRawMode(false);
        } catch {
          /* ignore */
        }
        process.stderr.write("\n");
      }
      process.stdin.pause();
      const raw = Buffer.concat(chunks)
        .toString("utf8")
        .replace(/\r?\n$/, "");
      resolve(raw);
    }

    process.stdin.resume();
  });
}

async function main() {
  const password = await readStdinPassword();
  if (!password) {
    console.error("❌ 빈 비밀번호는 사용할 수 없습니다.");
    process.exit(1);
  }

  const record = await hashAdminPassword(password);
  // Only the derived record goes to stdout — never the plaintext, never a log line containing it.
  process.stdout.write(record + "\n");
}

void main();
