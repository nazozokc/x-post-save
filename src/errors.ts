/** An API-side failure, shared by the HTTP client and the payload normalizer. */
export class ApiError extends Error {
  readonly status?: number;
  /** Whether retrying the request could plausibly succeed. */
  readonly retryable: boolean;

  constructor(message: string, status?: number, retryable = status === undefined || status >= 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryable = retryable;
  }
}
