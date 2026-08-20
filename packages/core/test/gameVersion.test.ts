import assert from "node:assert/strict";
import test from "node:test";
import { isValidGameVersion, type GameVersion } from "../src/index.js";

const validVersion: GameVersion = {
  id: 1,
  gameId: 2,
  objectKey: "uploads/2/hash.zip",
  contentHash: "abc123",
  bundleBytes: 100,
  publishStatus: "READY",
  publishError: null,
  publishedAt: "2026-08-21T00:00:00.000Z",
  manifestKey: "games/2/1/manifest.json",
  publishedSizeBytes: 200,
  fileCount: 3,
  uploadedAt: "2026-08-20T23:00:00.000Z",
};

test("GameVersion accepts provider-neutral bundle/publish facts", () => {
  assert.equal(isValidGameVersion(validVersion), true);
});

test("GameVersion rejects malformed identifiers, sizes, status, and timestamps", () => {
  assert.equal(isValidGameVersion({ ...validVersion, id: 0 }), false);
  assert.equal(isValidGameVersion({ ...validVersion, gameId: 1.5 }), false);
  assert.equal(isValidGameVersion({ ...validVersion, objectKey: "" }), false);
  assert.equal(isValidGameVersion({ ...validVersion, bundleBytes: -1 }), false);
  assert.equal(isValidGameVersion({ ...validVersion, publishStatus: "APPROVED" }), false);
  assert.equal(isValidGameVersion({ ...validVersion, fileCount: 1.5 }), false);
  assert.equal(isValidGameVersion({ ...validVersion, uploadedAt: "" }), false);
});

test("GameVersion has no USER review or publisher fields", () => {
  assert.equal("status" in validVersion, false);
  assert.equal("reviewedByAdminId" in validVersion, false);
  assert.equal("rejectReason" in validVersion, false);
  assert.equal("developerUserId" in validVersion, false);
});
