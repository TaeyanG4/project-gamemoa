import test from "node:test";
import assert from "node:assert/strict";
import {
  validateVanitySlug,
  hasGuildManagementPermission,
  slugifyGuildName,
} from "../src/domain/discordGuildPolicy.js";

test("validateVanitySlug accepts valid vanity slugs", () => {
  assert.equal(validateVanitySlug("community").valid, true);
  assert.equal(validateVanitySlug("my-guild-123").valid, true);
  assert.equal(validateVanitySlug("gaming-hub").valid, true);
});

test("validateVanitySlug rejects invalid lengths and characters", () => {
  assert.equal(validateVanitySlug("ab").valid, false); // < 3
  assert.equal(validateVanitySlug("a".repeat(33)).valid, false); // > 32
  assert.equal(validateVanitySlug("MyGuild").valid, false); // uppercase
  assert.equal(validateVanitySlug("-leading-hyphen").valid, false);
  assert.equal(validateVanitySlug("trailing-hyphen-").valid, false);
  assert.equal(validateVanitySlug("double--hyphen").valid, false);
  assert.equal(validateVanitySlug("space in slug").valid, false);
});

test("validateVanitySlug rejects reserved slugs", () => {
  assert.equal(validateVanitySlug("register").valid, false);
  assert.equal(validateVanitySlug("admin").valid, false);
  assert.equal(validateVanitySlug("api").valid, false);
  assert.equal(validateVanitySlug("link").valid, false);
  assert.equal(validateVanitySlug("gamemoa").valid, false);
});

test("hasGuildManagementPermission accurately evaluates permissions bitfield and owner state", () => {
  assert.equal(hasGuildManagementPermission("0", true), true); // owner
  assert.equal(hasGuildManagementPermission("32", false), true); // MANAGE_GUILD (0x20 = 32)
  assert.equal(hasGuildManagementPermission("8", false), true); // ADMINISTRATOR (0x8 = 8)
  assert.equal(hasGuildManagementPermission("40", false), true); // MANAGE_GUILD + ADMINISTRATOR (32+8)
  assert.equal(hasGuildManagementPermission("1", false), false); // CREATE_INSTANT_INVITE
  assert.equal(hasGuildManagementPermission(null, false), false);
});

test("slugifyGuildName generates clean valid slugs from arbitrary names", () => {
  assert.equal(slugifyGuildName("My Cool Guild!"), "my-cool-guild");
  assert.equal(slugifyGuildName("AB"), "guild-ab");
  assert.equal(slugifyGuildName("Admin"), "admin-hub");
});
