import assert from "node:assert/strict";
import test from "node:test";
import { SandboxGameVersionPublicationRepository } from "../src/application/sandboxGameVersionPublicationRepository.js";
import type { SandboxGameRepository, SandboxGameVersionRecord } from "../src/ports/sandboxGames.js";

const target = { gameId: 7, versionId: 11, contentHash: "b".repeat(64) } as const;

function version(): SandboxGameVersionRecord {
  return {
    id: target.versionId,
    gameId: target.gameId,
    objectKey: `uploads/${target.gameId}/${target.contentHash}.zip`,
    contentHash: target.contentHash,
    bundleBytes: 10,
    status: "PENDING_REVIEW",
    reviewedByAdminId: null,
    reviewedAt: null,
    rejectReason: null,
    uploadedAt: "2026-08-21T00:00:00.000Z",
    publishStatus: "UPLOADED",
    publishError: null,
    publishedAt: null,
    manifestKey: null,
    publishedSizeBytes: null,
    fileCount: null,
  };
}

function repository() {
  let current = version();
  let writes = 0;
  const repo = {
    async findVersionById(id: number) {
      return id === current.id ? current : null;
    },
    async setVersionPublishState(id: number, state: Partial<SandboxGameVersionRecord>) {
      assert.equal(id, current.id);
      writes += 1;
      current = { ...current, ...state };
      return current;
    },
  } as unknown as SandboxGameRepository;
  return { repo, current: () => current, writes: () => writes };
}

test("USER publication state transitions require the exact immutable target binding", async () => {
  const state = repository();
  const adapter = new SandboxGameVersionPublicationRepository(state.repo);

  for (const mismatch of [
    { ...target, gameId: target.gameId + 1 },
    { ...target, versionId: target.versionId + 1 },
    { ...target, contentHash: "c".repeat(64) },
  ]) {
    await assert.rejects(() => adapter.markPublishing(mismatch), /does not exist|target mismatch/);
  }
  assert.equal(state.writes(), 0);
});

test("USER READY publication remains independent from PENDING_REVIEW status", async () => {
  const state = repository();
  const adapter = new SandboxGameVersionPublicationRepository(state.repo);

  await adapter.markPublishing(target);
  await adapter.markReady(target, {
    publishedAt: "2026-08-21T01:00:00.000Z",
    manifestKey: `games/${target.gameId}/${target.versionId}/.owogg-manifest.json`,
    publishedSizeBytes: 20,
    fileCount: 2,
  });

  assert.equal(state.current().publishStatus, "READY");
  assert.equal(state.current().status, "PENDING_REVIEW");
  assert.equal(state.writes(), 2);
});
