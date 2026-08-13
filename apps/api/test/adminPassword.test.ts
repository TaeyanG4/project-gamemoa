import test from "node:test";
import assert from "node:assert/strict";
import {
  hashAdminPassword,
  verifyAdminPassword,
  safeStringEqual,
} from "../src/auth/adminPassword.js";

test("hashAdminPassword produces a pbkdf2_sha256 record verifiable by verifyAdminPassword", async () => {
  const record = await hashAdminPassword("correct horse battery staple", 1000);
  assert.match(record, /^pbkdf2_sha256\$1000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
  assert.equal(await verifyAdminPassword("correct horse battery staple", record), true);
});

test("verifyAdminPassword rejects a wrong password", async () => {
  const record = await hashAdminPassword("right-password", 1000);
  assert.equal(await verifyAdminPassword("wrong-password", record), false);
});

test("verifyAdminPassword rejects malformed/absent records instead of throwing", async () => {
  assert.equal(await verifyAdminPassword("anything", undefined), false);
  assert.equal(await verifyAdminPassword("anything", ""), false);
  assert.equal(await verifyAdminPassword("anything", "not-a-valid-record"), false);
  assert.equal(await verifyAdminPassword("anything", "pbkdf2_sha256$abc$salt$hash"), false);
});

test("two hashes of the same password use different random salts", async () => {
  const a = await hashAdminPassword("same-password", 1000);
  const b = await hashAdminPassword("same-password", 1000);
  assert.notEqual(a, b);
  assert.equal(await verifyAdminPassword("same-password", a), true);
  assert.equal(await verifyAdminPassword("same-password", b), true);
});

test("safeStringEqual behaves like equality for admin username comparison", () => {
  assert.equal(safeStringEqual("admin", "admin"), true);
  assert.equal(safeStringEqual("admin", "Admin"), false);
  assert.equal(safeStringEqual("admin", "administrator"), false);
  assert.equal(safeStringEqual("", ""), true);
});
