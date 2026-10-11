import { describe, expect, test } from "bun:test";
import { parsePostRef } from "./url.ts";

describe("parsePostRef", () => {
  test("accepts a bare snowflake id", () => {
    expect(parsePostRef("20")).toEqual({ id: "20" });
    expect(parsePostRef(" 1142974214 ")).toEqual({ id: "1142974214" });
  });

  test("accepts x.com and twitter.com status urls", () => {
    expect(parsePostRef("https://x.com/jack/status/20")).toEqual({ id: "20", screenName: "jack" });
    expect(parsePostRef("https://twitter.com/jack/status/20?s=20")).toEqual({
      id: "20",
      screenName: "jack",
    });
    expect(parsePostRef("https://mobile.twitter.com/jack/status/20")).toEqual({
      id: "20",
      screenName: "jack",
    });
    expect(parsePostRef("x.com/jack/statuses/20")).toEqual({ id: "20", screenName: "jack" });
  });

  test("handles /i/web/status/<id> links without a screen name", () => {
    expect(parsePostRef("https://twitter.com/i/web/status/20")).toEqual({ id: "20" });
  });

  test("rejects non-post input", () => {
    expect(parsePostRef("")).toBeNull();
    expect(parsePostRef("hello")).toBeNull();
    expect(parsePostRef("https://example.com/jack/status/20")).toBeNull();
    expect(parsePostRef("https://x.com/jack")).toBeNull();
    expect(parsePostRef("1")).toBeNull(); // too short to be a snowflake
  });
});
