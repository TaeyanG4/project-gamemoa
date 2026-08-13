// Pure, deterministic comparison between the local DISCORD_COMMANDS single source of truth
// (apps/api/src/infrastructure/discord/commands.ts) and whatever Discord's REST API currently
// has registered (global or a single guild). No network access here — `scripts/discord-commands-check.ts`
// does the actual fetch and passes both sides in, so this logic is unit-testable without ever
// calling live Discord.

export interface CommandOptionLike {
  type: number;
  name: string;
  description?: string;
  required?: boolean;
  choices?: Array<{ name: string; value: string | number }>;
  options?: CommandOptionLike[];
}

export interface CommandLike {
  name: string;
  description?: string;
  options?: CommandOptionLike[];
}

export interface CommandMismatch {
  name: string;
  reason: string;
}

export interface CommandDriftResult {
  inSync: boolean;
  /** Commands in the local SSoT but not currently registered remotely. */
  missing: string[];
  /** Commands registered remotely but not present in the local SSoT (Discord-generated fields
   * like id/application_id/version/guild_id are never considered "extra" — only extra command
   * *names* matter here). */
  extra: string[];
  /** Commands present on both sides whose meaningful fields (name/description/options/choices)
   * differ. */
  mismatched: CommandMismatch[];
}

function normalizeOptions(options: CommandOptionLike[] | undefined): CommandOptionLike[] {
  return (options ?? [])
    .map((o) => ({
      type: o.type,
      name: o.name,
      description: o.description ?? "",
      required: Boolean(o.required),
      choices: (o.choices ?? [])
        .map((c) => ({ name: c.name, value: c.value }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      options: normalizeOptions(o.options),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function optionsEqual(a: CommandOptionLike[], b: CommandOptionLike[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((optA, i) => {
    const optB = b[i];
    if (!optB) return false;
    return (
      optA.type === optB.type &&
      optA.name === optB.name &&
      optA.description === optB.description &&
      optA.required === optB.required &&
      JSON.stringify(optA.choices) === JSON.stringify(optB.choices) &&
      optionsEqual(optA.options ?? [], optB.options ?? [])
    );
  });
}

/** Compares meaningful command fields only — never Discord-generated id/application_id/version/
 * guild_id/default_member_permissions/dm_permission/etc. */
export function diffDiscordCommands(
  local: CommandLike[],
  remote: CommandLike[],
): CommandDriftResult {
  const localByName = new Map(local.map((c) => [c.name, c] as const));
  const remoteByName = new Map(remote.map((c) => [c.name, c] as const));

  const missing = [...localByName.keys()].filter((name) => !remoteByName.has(name)).sort();
  const extra = [...remoteByName.keys()].filter((name) => !localByName.has(name)).sort();

  const mismatched: CommandMismatch[] = [];
  for (const [name, localCmd] of localByName) {
    const remoteCmd = remoteByName.get(name);
    if (!remoteCmd) continue; // already reported as "missing"

    const reasons: string[] = [];
    if ((localCmd.description ?? "") !== (remoteCmd.description ?? "")) {
      reasons.push("description differs");
    }
    if (!optionsEqual(normalizeOptions(localCmd.options), normalizeOptions(remoteCmd.options))) {
      reasons.push("options/subcommands/choices differ");
    }
    if (reasons.length > 0) {
      mismatched.push({ name, reason: reasons.join("; ") });
    }
  }

  return {
    inSync: missing.length === 0 && extra.length === 0 && mismatched.length === 0,
    missing,
    extra,
    mismatched,
  };
}
