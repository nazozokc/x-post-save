import { describe, expect, test } from "bun:test";
import { fetchStatus, type FetchOptions } from "./api.ts";
import { ApiError } from "./errors.ts";

/** Builds a stub fetch that records the init object and returns queued responses. */
function stub(responses: Array<Response | Error>): {
  fetchImpl: typeof fetch;
  calls: Array<{ url: string; init: RequestInit }>;
} {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let index = 0;
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    const next = responses[Math.min(index++, responses.length - 1)]!;
    if (next instanceof Error) throw next;
    return next;
  }) as typeof fetch;
  return { fetchImpl, calls };
}

const options = (overrides: FetchOptions): FetchOptions => ({
  baseUrl: "https://api.example",
  retryDelay: async () => {},
  ...overrides,
});

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("fetchStatus", () => {
  test("returns the parsed body on success", async () => {
    const s = stub([json({ code: 200, status: { id: "20" } })]);
    const result = await fetchStatus("20", options({ fetchImpl: s.fetchImpl }));
    expect(result).toEqual({ code: 200, status: { id: "20" } });
    expect(s.calls).toHaveLength(1);
    expect(s.calls[0]!.url).toBe("https://api.example/2/status/20");
    expect(s.calls[0]!.init.redirect).toBe("error");
  });

  test("retries 5xx and succeeds on a later attempt", async () => {
    const s = stub([json({ error: "down" }, 503), json({ code: 200, status: { id: "20" } })]);
    const result = await fetchStatus("20", options({ fetchImpl: s.fetchImpl }));
    expect(result).toEqual({ code: 200, status: { id: "20" } });
    expect(s.calls).toHaveLength(2);
  });

  test("retries network errors up to the attempt cap", async () => {
    const s = stub([new Error("network down")]);
    const error = await fetchStatus("20", options({ fetchImpl: s.fetchImpl })).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("network down");
    expect(s.calls).toHaveLength(3);
  });

  test("does not retry a 4xx response with a JSON error body", async () => {
    const s = stub([json({ code: 400, message: "bad id" }, 400)]);
    const result = await fetchStatus("bad", options({ fetchImpl: s.fetchImpl }));
    expect(result).toEqual({ code: 400, message: "bad id" });
    expect(s.calls).toHaveLength(1);
  });

  test("throws immediately on a 4xx response without a body", async () => {
    const s = stub([new Response(null, { status: 404 })]);
    const error = await fetchStatus("20", options({ fetchImpl: s.fetchImpl })).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe("API request failed (404)");
    expect(s.calls).toHaveLength(1);
  });

  test("throws immediately on an empty 2xx response", async () => {
    const s = stub([new Response("", { status: 200 })]);
    const error = await fetchStatus("20", options({ fetchImpl: s.fetchImpl })).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe("API returned an empty response");
    expect(s.calls).toHaveLength(1);
  });

  test("rejects an oversized response declared by Content-Length", async () => {
    const response = new Response("{}", {
      status: 200,
      headers: { "content-length": "99999999" },
    });
    const s = stub([response]);
    const error = await fetchStatus("20", options({ fetchImpl: s.fetchImpl })).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toContain("too large");
    expect(s.calls).toHaveLength(1);
  });

  test("rejects an oversized streamed response without Content-Length", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("a".repeat(50)));
        controller.enqueue(encoder.encode("a".repeat(50)));
        controller.close();
      },
    });
    const s = stub([new Response(body, { status: 200 })]);
    const error = await fetchStatus("20", options({ fetchImpl: s.fetchImpl, maxBytes: 64 })).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toContain("too large");
    expect(s.calls).toHaveLength(1);
  });
});
