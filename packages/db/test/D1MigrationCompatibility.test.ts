import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createSqliteD1 } from "./helpers/sqliteD1.js";

test("pending A-3/A-4 production migrations avoid Cloudflare-incompatible TEMP table DDL", () => {
  for (const filename of [
    "0030_user_identity_write_convergence.sql",
    "0031_game_version_write_convergence.sql",
  ]) {
    const sql = fs.readFileSync(new URL(`../migrations/${filename}`, import.meta.url), "utf8");
    assert.doesNotMatch(sql, /\bCREATE\s+TEMP(?:ORARY)?\s+TABLE\b/i, filename);
  }
});

test("0032 migrates one-use attempts to generic identity/version foreign keys", () => {
  const migration = fs.readFileSync(
    new URL("../migrations/0032_generic_score_acceptance.sql", import.meta.url),
    "utf8",
  );
  const { raw } = createSqliteD1(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE users (id INTEGER PRIMARY KEY);
    CREATE TABLE games (id INTEGER PRIMARY KEY);
    CREATE TABLE game_versions (id INTEGER PRIMARY KEY, game_id INTEGER NOT NULL);
    CREATE TABLE game_attempt_consumptions (
      attempt_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      game_id INTEGER NOT NULL,
      version_id INTEGER NOT NULL,
      consumed_at TEXT NOT NULL
    );
  `);
  raw.exec("INSERT INTO users (id) VALUES (1)");
  raw.exec("INSERT INTO games (id) VALUES (9)");
  raw.exec("INSERT INTO game_versions (id, game_id) VALUES (5, 9)");
  raw.exec(
    "INSERT INTO game_attempt_consumptions (attempt_id, user_id, game_id, version_id, consumed_at) VALUES ('a', 1, 9, 5, 'now')",
  );

  raw.exec(migration);

  const row = raw
    .prepare("SELECT attempt_id, game_id, version_id FROM game_attempt_consumptions")
    .get() as { attempt_id: string; game_id: number; version_id: number };
  assert.deepEqual({ ...row }, { attempt_id: "a", game_id: 9, version_id: 5 });
  assert.throws(() =>
    raw
      .prepare(
        "INSERT INTO game_attempt_consumptions (attempt_id, user_id, game_id, version_id, consumed_at) VALUES ('orphan', 1, 99, 99, 'now')",
      )
      .run(),
  );
});
