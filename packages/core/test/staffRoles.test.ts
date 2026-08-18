import test from "node:test";
import assert from "node:assert/strict";
import {
  PERMISSIONS,
  STAFF_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  hasPermission,
  effectivePermissions,
  isProtectedStaffRole,
  isDelegatablePermission,
  type Permission,
} from "../src/domain/staffRoles.js";

// Pure domain coverage for the permission-resolution rules every /api/admin/* route and
// /api/me/access depend on (via requirePermission / requireElevatedAdmin in
// apps/api/src/auth/adminSession.ts). See docs/AUTHORIZATION.md.

test("hasPermission: ADMIN implicitly has every permission, including ones granted to no one", () => {
  for (const permission of PERMISSIONS) {
    assert.equal(hasPermission("ADMIN", [], permission), true, `ADMIN should have ${permission}`);
  }
  // Even a permission ADMIN's own account has no explicit admin_permission_grants row for.
  assert.equal(hasPermission("ADMIN", [], "roles.manage"), true);
});

test("hasPermission: OPERATOR gets its default bundle without any individual grants", () => {
  assert.equal(hasPermission("OPERATOR", [], "users.ban"), true);
  assert.equal(hasPermission("OPERATOR", [], "games.moderate"), true);
  assert.equal(hasPermission("OPERATOR", [], "sandbox_games.review"), true);
  // Not in any default bundle, and not individually granted.
  assert.equal(hasPermission("OPERATOR", [], "roles.manage"), false);
});

test("hasPermission: MODERATOR's default bundle deliberately excludes users.ban/games.moderate/game_creators.manage", () => {
  assert.equal(hasPermission("MODERATOR", [], "users.view"), true);
  assert.equal(hasPermission("MODERATOR", [], "users.suspend"), true);
  assert.equal(hasPermission("MODERATOR", [], "sandbox_games.review"), true);
  assert.equal(hasPermission("MODERATOR", [], "users.ban"), false);
  assert.equal(hasPermission("MODERATOR", [], "games.moderate"), false);
  assert.equal(hasPermission("MODERATOR", [], "game_creators.manage"), false);
});

test("hasPermission: an individual grant extends a role's default bundle (e.g. MODERATOR + users.ban)", () => {
  assert.equal(hasPermission("MODERATOR", ["users.ban"], "users.ban"), true);
  // Grants are additive, not a replacement — the rest of the default bundle still applies.
  assert.equal(hasPermission("MODERATOR", ["users.ban"], "users.view"), true);
  // A grant for a *different* permission doesn't leak into an ungranted one.
  assert.equal(hasPermission("MODERATOR", ["users.ban"], "games.moderate"), false);
});

test("hasPermission: SYSTEM_DEVELOPER has no admin.center.access by default, but can be individually granted it (§10)", () => {
  assert.equal(hasPermission("SYSTEM_DEVELOPER", [], "admin.center.access"), false);
  assert.equal(hasPermission("SYSTEM_DEVELOPER", [], "system.dev.access"), true);
  assert.equal(hasPermission("SYSTEM_DEVELOPER", [], "system.monitor"), true);

  // Granted admin.center.access + users.view WITHOUT users.ban/roles.manage — the exact §10
  // example: can enter the admin center and view users, but cannot ban or assign roles.
  const granted: Permission[] = ["admin.center.access", "users.view"];
  assert.equal(hasPermission("SYSTEM_DEVELOPER", granted, "admin.center.access"), true);
  assert.equal(hasPermission("SYSTEM_DEVELOPER", granted, "users.view"), true);
  assert.equal(hasPermission("SYSTEM_DEVELOPER", granted, "users.ban"), false);
  assert.equal(hasPermission("SYSTEM_DEVELOPER", granted, "roles.manage"), false);
});

test("hasPermission: no Staff Role (null) never has any permission, even with stray grants", () => {
  for (const permission of PERMISSIONS) {
    assert.equal(hasPermission(null, [], permission), false);
  }
  // Defensive: a grant row shouldn't exist without a managed account/role, but the pure function
  // must not accidentally honor one if it somehow did.
  assert.equal(hasPermission(null, ["users.view"], "users.view"), false);
});

test("effectivePermissions: ADMIN resolves to the entire permission catalog", () => {
  const result = effectivePermissions("ADMIN", []);
  assert.deepEqual([...result].sort(), [...PERMISSIONS].sort());
});

test("effectivePermissions: null Staff Role resolves to an empty list", () => {
  assert.deepEqual(effectivePermissions(null, []), []);
  // Even with stray grants — a plain USER's grants (which should never exist) don't leak through.
  assert.deepEqual(effectivePermissions(null, ["users.view"]), []);
});

test("effectivePermissions: a role with no extra grants matches its default bundle exactly (order-insensitive)", () => {
  for (const role of ["OPERATOR", "MODERATOR", "SYSTEM_DEVELOPER"] as const) {
    const result = effectivePermissions(role, []);
    assert.deepEqual([...result].sort(), [...DEFAULT_ROLE_PERMISSIONS[role]].sort());
  }
});

test("effectivePermissions: merges default bundle + individual grants with no duplicates", () => {
  const result = effectivePermissions("MODERATOR", ["users.ban", "sandbox_games.review"]);
  // sandbox_games.review is already in MODERATOR's default bundle — granting it again must not
  // produce a duplicate entry.
  const occurrences = result.filter((p) => p === "sandbox_games.review").length;
  assert.equal(occurrences, 1);
  assert.ok(result.includes("users.ban"));
  assert.deepEqual(
    [...result].sort(),
    [...new Set([...DEFAULT_ROLE_PERMISSIONS.MODERATOR, "users.ban"])].sort(),
  );
});

test("isProtectedStaffRole: true only for ADMIN", () => {
  assert.equal(isProtectedStaffRole("ADMIN"), true);
  assert.equal(isProtectedStaffRole("OPERATOR"), false);
  assert.equal(isProtectedStaffRole("MODERATOR"), false);
  assert.equal(isProtectedStaffRole("SYSTEM_DEVELOPER"), false);
  assert.equal(isProtectedStaffRole(null), false);
});

test("isDelegatablePermission: every permission is delegable except roles.manage", () => {
  for (const permission of PERMISSIONS) {
    assert.equal(isDelegatablePermission(permission), permission !== "roles.manage");
  }
});

test("structural invariant: roles.manage never appears in any role's default bundle", () => {
  for (const role of STAFF_ROLES) {
    if (role === "ADMIN") continue; // ADMIN's "bundle" is implicit-all, handled separately.
    assert.ok(
      !DEFAULT_ROLE_PERMISSIONS[role].includes("roles.manage"),
      `${role}'s default bundle must not include roles.manage`,
    );
  }
});

test("STAFF_ROLES is exactly the four Staff/Operational roles from the design spec, in top-to-least order", () => {
  assert.deepEqual(STAFF_ROLES, ["ADMIN", "OPERATOR", "MODERATOR", "SYSTEM_DEVELOPER"]);
});
