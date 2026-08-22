import assert from "node:assert/strict";
import test from "node:test";
import { ApiClientError } from "../lib/api/errors.js";
import { isTransientApiError, retryAsync } from "../lib/api/retry.js";

test("retryAsync retries transient API failures and eventually returns", async () => {
  let calls = 0;
  const delays: number[] = [];
  const result = await retryAsync(
    async () => {
      calls += 1;
      if (calls < 3) throw new ApiClientError("NetworkError", "offline");
      return "ready";
    },
    { attempts: 3, delaysMs: [1, 2] },
    async (delayMs) => {
      delays.push(delayMs);
    },
  );

  assert.equal(result, "ready");
  assert.equal(calls, 3);
  assert.deepEqual(delays, [1, 2]);
});

test("retryAsync does not retry authentication or contract failures", async () => {
  for (const error of [
    new ApiClientError("HttpError", "unauthorized", { status: 401 }),
    new ApiClientError("ContractError", "invalid response"),
  ]) {
    let calls = 0;
    await assert.rejects(
      retryAsync(async () => {
        calls += 1;
        throw error;
      }),
      error,
    );
    assert.equal(calls, 1);
  }
});

test("isTransientApiError accepts network, rate-limit and server failures only", () => {
  assert.equal(isTransientApiError(new ApiClientError("NetworkError", "offline")), true);
  assert.equal(
    isTransientApiError(new ApiClientError("HttpError", "rate limited", { status: 429 })),
    true,
  );
  assert.equal(
    isTransientApiError(new ApiClientError("HttpError", "unavailable", { status: 503 })),
    true,
  );
  assert.equal(
    isTransientApiError(new ApiClientError("HttpError", "unauthorized", { status: 401 })),
    false,
  );
});
