import { ApiClientError } from "./errors.js";

export interface RetryOptions {
  attempts?: number;
  delaysMs?: number[];
  shouldRetry?: (error: unknown) => boolean;
}

type Sleep = (delayMs: number) => Promise<void>;

const defaultSleep: Sleep = (delayMs) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

export function isTransientApiError(error: unknown): boolean {
  if (!(error instanceof ApiClientError)) return false;
  if (error.kind === "NetworkError") return true;
  return error.kind === "HttpError" && (error.status === 429 || (error.status ?? 0) >= 500);
}

export async function retryAsync<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
  sleep: Sleep = defaultSleep,
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const delaysMs = options.delaysMs ?? [250, 750];
  const shouldRetry = options.shouldRetry ?? isTransientApiError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts || !shouldRetry(error)) throw error;
      await sleep(delaysMs[Math.min(attempt - 1, delaysMs.length - 1)] ?? 0);
    }
  }

  throw new Error("retryAsync exhausted without returning or throwing");
}
