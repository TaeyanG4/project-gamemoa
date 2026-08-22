import assert from "node:assert/strict";
import test from "node:test";
import * as core from "../src/index.js";

test("the retired Git official bootstrap is not exported from the active core API", () => {
  assert.equal("OfficialGameBootstrap" in core, false);
  assert.equal("OfficialGameBootstrapRepository" in core, false);
  assert.equal("OfficialGameUploadUseCases" in core, true);
});
