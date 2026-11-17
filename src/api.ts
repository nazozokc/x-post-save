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

const API_BASE = "https://api.fxtwitter.com";
const TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 250;
const MAX_ATTEMPTS = 3;
const MAX_BODY_BYTES = 2 * 1024 * 1024;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Injectable seams keep the retry and limit logic testable without network access. */
export interface FetchOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  maxBytes?: number;
  retryDelay?: (ms: number) => Promise<void>;
}

/** Reads a body with a hard byte cap, even when Content-Length is absent or wrong. */
async function readBody(response: Response, maxBytes: number): Promise<string> {
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    const size = Number(declared);
    if (Number.isFinite(size) && size > maxBytes) {
      throw new ApiError(`API response too large (${size} bytes)`, response.status, false);
    }
  }

  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new ApiError(`API response too large (>${maxBytes} bytes)`, response.status, false);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** Performs one request and returns the response with its parsed JSON body (if any). */
async function request(url: string, options: Required<FetchOptions>): Promise<{ response: Response; body: unknown }> {
  const response = await options.fetchImpl(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    // A fixed API host must not be able to redirect the client elsewhere.
    redirect: "error",
  });

  const text = await readBody(response, options.maxBytes);
  let body: unknown;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
  }

  return { response, body };
}

/**
 * Fetches a post payload from the FxTwitter API.
 *
 * Retries transient failures (network errors, timeouts, 5xx) but never 4xx,
 * empty 2xx responses, oversized bodies, or redirects. Non-OK JSON bodies are
 * returned as-is so the normalizer can surface the API's own error message.
 */
export async function fetchStatus(id: string, overrides: FetchOptions = {}): Promise<unknown> {
  const options: Required<FetchOptions> = {
    baseUrl: overrides.baseUrl ?? API_BASE,
    fetchImpl: overrides.fetchImpl ?? fetch,
    maxBytes: overrides.maxBytes ?? MAX_BODY_BYTES,
    retryDelay: overrides.retryDelay ?? sleep,
  };
  const url = `${options.baseUrl}/2/status/${encodeURIComponent(id)}`;
  let lastError: Error = new ApiError("request failed");

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await options.retryDelay(RETRY_DELAY_MS * attempt);

    try {
      const { response, body } = await request(url, options);

      if (response.ok) {
        if (body === undefined) {
          throw new ApiError("API returned an empty response", response.status, false);
        }
        return body;
      }

      if (response.status >= 500) {
        lastError = new ApiError(`API server error (${response.status})`, response.status);
        continue;
      }

      if (body !== undefined) return body;
      throw new ApiError(`API request failed (${response.status})`, response.status, false);
    } catch (error) {
      const wrapped = error instanceof Error ? error : new ApiError(String(error));
      lastError = wrapped;
      if (wrapped instanceof ApiError && !wrapped.retryable) throw wrapped;
    }
  }

  throw lastError;
}
