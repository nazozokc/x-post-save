export class ApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE = "https://api.fxtwitter.com";
const TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 250;
const MAX_ATTEMPTS = 3;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches a post payload from the FxTwitter API.
 *
 * Retries transient failures (network errors, timeouts, 5xx) but never 4xx —
 * those can only fail again. Non-OK JSON bodies are returned as-is so the
 * normalizer can surface the API's own error message.
 */
export async function fetchStatus(id: string): Promise<unknown> {
  const url = `${API_BASE}/2/status/${encodeURIComponent(id)}`;
  let lastError: Error = new ApiError("request failed");

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAY_MS * attempt);

    try {
      const response = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      const text = await response.text();
      let body: unknown;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = undefined;
        }
      }

      if (response.ok) {
        if (body === undefined) {
          throw new ApiError("API returned an empty response", response.status);
        }
        return body;
      }

      if (response.status >= 500) {
        lastError = new ApiError(`API server error (${response.status})`, response.status);
        continue;
      }

      if (body !== undefined) return body;
      throw new ApiError(`API request failed (${response.status})`, response.status);
    } catch (error) {
      const wrapped = error instanceof Error ? error : new ApiError(String(error));
      lastError = wrapped;
      // Client errors are not worth retrying.
      if (wrapped instanceof ApiError && wrapped.status !== undefined && wrapped.status < 500) {
        throw wrapped;
      }
    }
  }

  throw lastError;
}
