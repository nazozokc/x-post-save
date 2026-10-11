import { describe, expect, test } from "bun:test";
import { resolveArgs, tokenize } from "./parser.ts";
import type { ArgDefinitions } from "./types.ts";

const args = {
  format: { type: "string", required: true, short: "f" },
  out: { type: "string", default: "." },
  verbose: { type: "boolean" },
} satisfies ArgDefinitions;

describe("tokenize", () => {
  test("splits long, short, inline and positional tokens", () => {
    expect(tokenize(["-f", "json", "--out=/tmp", "url"])).toEqual([
      { kind: "short", name: "f" },
      { kind: "positional", value: "json" },
      { kind: "long", name: "out", value: "/tmp" },
      { kind: "positional", value: "url" },
    ]);
  });

  test("treats everything after -- as positional", () => {
    expect(tokenize(["--", "--format"])).toEqual([{ kind: "positional", value: "--format" }]);
  });
});

describe("resolveArgs", () => {
  test("resolves values, defaults and positionals", () => {
    const result = resolveArgs(tokenize(["-f", "json", "https://x.com/jack/status/20"]), args);
    expect(result.errors).toEqual([]);
    expect(result.values).toEqual({ format: "json", out: ".", verbose: false });
    expect(result.positionals).toEqual(["https://x.com/jack/status/20"]);
  });

  test("supports inline values and short flags", () => {
    const result = resolveArgs(tokenize(["-f=yaml", "--out", "/tmp/out"]), args);
    expect(result.values.format).toBe("yaml");
    expect(result.values.out).toBe("/tmp/out");
  });

  test("reports unknown options", () => {
    const result = resolveArgs(tokenize(["--nope", "-f", "json"]), args);
    expect(result.errors).toContain("unknown option '--nope'");
  });

  test("reports missing required options", () => {
    const result = resolveArgs(tokenize([]), args);
    expect(result.errors).toContain("option '--format' is required");
  });

  test("handles boolean flags and --no- negation", () => {
    expect(resolveArgs(tokenize(["-f", "json", "--verbose"]), args).values.verbose).toBe(true);
    expect(resolveArgs(tokenize(["-f", "json", "--no-verbose"]), args).values.verbose).toBe(false);
  });
});
