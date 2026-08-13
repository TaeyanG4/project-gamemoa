import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateAdminPasswordPolicy,
  isValidAdminUsername,
  ADMIN_ACCOUNT_POLICY,
} from "../src/domain/adminAccounts.js";

test("evaluateAdminPasswordPolicy: rejects passwords shorter than the minimum length", () => {
  const result = evaluateAdminPasswordPolicy({
    newPassword: "short1234567".slice(0, ADMIN_ACCOUNT_POLICY.MIN_PASSWORD_LENGTH - 1),
    username: "owogg-admin",
    matchesCurrentPassword: false,
  });
  assert.deepEqual(result, { ok: false, reason: "TOO_SHORT" });
});

test("evaluateAdminPasswordPolicy: accepts a 12+ character password with no composition rules", () => {
  const result = evaluateAdminPasswordPolicy({
    newPassword: "all lowercase long enough",
    username: "owogg-admin",
    matchesCurrentPassword: false,
  });
  assert.deepEqual(result, { ok: true });
});

test("evaluateAdminPasswordPolicy: rejects a password identical to the username", () => {
  const result = evaluateAdminPasswordPolicy({
    newPassword: "OwoggAdmin1234",
    username: "OwoggAdmin1234",
    matchesCurrentPassword: false,
  });
  assert.deepEqual(result, { ok: false, reason: "SAME_AS_USERNAME" });
});

test(
  "evaluateAdminPasswordPolicy: rejects reusing the current password — this is how a known " +
    "weak temporary bootstrap password gets structurally blocked without this module ever " +
    "embedding that literal value",
  () => {
    const result = evaluateAdminPasswordPolicy({
      newPassword: "whatever-the-current-password-is",
      username: "owogg-admin",
      matchesCurrentPassword: true,
    });
    assert.deepEqual(result, { ok: false, reason: "SAME_AS_CURRENT" });
  },
);

test("evaluateAdminPasswordPolicy: rejects passwords over the maximum length", () => {
  const result = evaluateAdminPasswordPolicy({
    newPassword: "a".repeat(ADMIN_ACCOUNT_POLICY.MAX_PASSWORD_LENGTH + 1),
    username: "owogg-admin",
    matchesCurrentPassword: false,
  });
  assert.deepEqual(result, { ok: false, reason: "TOO_LONG" });
});

test("isValidAdminUsername: accepts alnum/._- within length bounds, rejects everything else", () => {
  assert.equal(isValidAdminUsername("owogg-admin_1"), true);
  assert.equal(isValidAdminUsername("ab"), false); // too short
  assert.equal(isValidAdminUsername("a".repeat(65)), false); // too long
  assert.equal(isValidAdminUsername("admin user"), false); // whitespace
  assert.equal(isValidAdminUsername("admin<script>"), false); // disallowed characters
});
