export type ApiErrorKind = "NetworkError" | "HttpError" | "ContractError";

export class ApiClientError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number | undefined;
  readonly detail?: string | undefined;

  constructor(kind: ApiErrorKind, message: string, options?: { status?: number; detail?: string }) {
    super(message);
    this.name = "ApiClientError";
    this.kind = kind;
    if (options?.status !== undefined) {
      this.status = options.status;
    }
    if (options?.detail !== undefined) {
      this.detail = options.detail;
    }
  }
}
