import type { z } from "zod";
import { API_URL } from "./config";
import { ApiClientError } from "./errors";

export async function apiFetch<T>(
  endpoint: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  init?: RequestInit,
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;
  let res: Response;
  try {
    res = await fetch(url, {
      credentials: "include",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (err) {
    throw new ApiClientError(
      "NetworkError",
      err instanceof Error ? err.message : "네트워크 연결에 실패했습니다.",
    );
  }

  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = (await res.json()) as { error?: string; detail?: string; message?: string };
      detail = body.error || body.detail || body.message;
    } catch {
      // Failed to parse body as json
    }
    const errOptions: { status?: number; detail?: string } = {};
    if (res.status) errOptions.status = res.status;
    if (detail) errOptions.detail = detail;

    throw new ApiClientError(
      "HttpError",
      detail || `요청 처리에 실패했습니다. (HTTP ${res.status})`,
      errOptions,
    );
  }

  const json = await res.json();
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[Contract Mismatch]", parsed.error);
    }
    throw new ApiClientError("ContractError", "서버 응답 형식이 표준 계약과 일치하지 않습니다.");
  }

  return parsed.data;
}
