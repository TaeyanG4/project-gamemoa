import test from "node:test";
import assert from "node:assert/strict";
import { isAdminUserId, isTrustedAdminOrigin } from "../src/auth/admin.js";

const PROD_FRONTEND = "https://owogg.com";

test("isTrustedAdminOrigin: exact production origin is allowed", () => {
  assert.equal(isTrustedAdminOrigin(PROD_FRONTEND, PROD_FRONTEND), true);
});

test("isTrustedAdminOrigin: evil lookalike host is denied (no startsWith/prefix match)", () => {
  assert.equal(isTrustedAdminOrigin("https://owogg.com.evil.example", PROD_FRONTEND), false);
  assert.equal(isTrustedAdminOrigin("https://evil.example/owogg.com", PROD_FRONTEND), false);
});

test("isTrustedAdminOrigin: localhost is denied when FRONTEND_URL is production", () => {
  assert.equal(isTrustedAdminOrigin("http://localhost:5173", PROD_FRONTEND), false);
  assert.equal(isTrustedAdminOrigin("http://127.0.0.1:5173", PROD_FRONTEND), false);
});

test("isTrustedAdminOrigin: localhost is allowed only when FRONTEND_URL itself is localhost", () => {
  const devFrontend = "http://localhost:5173";
  assert.equal(isTrustedAdminOrigin("http://localhost:5173", devFrontend), true);
  // Different localhost port than the configured dev frontend must still fail exact match,
  // but is covered by the localhost-to-localhost development exception.
  assert.equal(isTrustedAdminOrigin("http://127.0.0.1:5173", devFrontend), true);
});

test("isTrustedAdminOrigin: missing Origin is denied", () => {
  assert.equal(isTrustedAdminOrigin(undefined, PROD_FRONTEND), false);
});

test("isTrustedAdminOrigin: malformed Origin is denied", () => {
  assert.equal(isTrustedAdminOrigin("not-a-url", PROD_FRONTEND), false);
});

test("isTrustedAdminOrigin: differing scheme/port on an otherwise-matching host is denied", () => {
  assert.equal(isTrustedAdminOrigin("http://owogg.com", PROD_FRONTEND), false);
  assert.equal(isTrustedAdminOrigin(`${PROD_FRONTEND}:8443`, PROD_FRONTEND), false);
});

test("isAdminUserId: matches an explicit configured ID", () => {
  assert.equal(isAdminUserId(42, "42"), true);
  assert.equal(isAdminUserId(42, "1,42,99"), true);
});

test("isAdminUserId: rejects when unconfigured or not listed", () => {
  assert.equal(isAdminUserId(42, undefined), false);
  assert.equal(isAdminUserId(42, ""), false);
  assert.equal(isAdminUserId(42, "1,2,3"), false);
});

test("isAdminUserId: rejects non-positive/non-integer user IDs", () => {
  assert.equal(isAdminUserId(0, "0"), false);
  assert.equal(isAdminUserId(-1, "-1"), false);
  assert.equal(isAdminUserId(1.5, "1.5"), false);
});
