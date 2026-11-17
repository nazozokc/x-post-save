import { describe, expect, test } from "bun:test";
import { escapeMarkdown, markdownUrl, safeUrl, sanitizeTerminal } from "./text.ts";

describe("sanitizeTerminal", () => {
  test("removes ANSI escapes, newlines and bidirectional overrides", () => {
    expect(sanitizeTerminal("bad\u001b[31mred\u001b[0m\nfake\u202Eline")).toBe(
      "bad [31mred [0m fake line",
    );
  });

  test("keeps ordinary text intact", () => {
    expect(sanitizeTerminal("post is unavailable (deleted)")).toBe("post is unavailable (deleted)");
  });
});

describe("safeUrl", () => {
  test("accepts absolute http(s) URLs", () => {
    expect(safeUrl("https://pbs.twimg.com/media/a.jpg")).toBe("https://pbs.twimg.com/media/a.jpg");
    expect(safeUrl("http://example.com/x")).toBe("http://example.com/x");
  });

  test("rejects dangerous schemes, credentials and control characters", () => {
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("data:text/html,<script>")).toBeUndefined();
    expect(safeUrl("file:///etc/passwd")).toBeUndefined();
    expect(safeUrl("//example.com/x")).toBeUndefined();
    expect(safeUrl("https://user:pass@example.com/")).toBeUndefined();
    expect(safeUrl("https://x.com/\u001b[31m")).toBeUndefined();
    expect(safeUrl("")).toBeUndefined();
  });
});

describe("markdownUrl", () => {
  test("encodes parentheses so link destinations cannot be broken out of", () => {
    expect(markdownUrl("https://x.com/a(b)c")).toBe("https://x.com/a%28b%29c");
  });
});

describe("escapeMarkdown", () => {
  test("escapes syntax that could create links, emphasis or tables", () => {
    expect(escapeMarkdown("a [x](javascript:1) *b* | `c` <script>")).toBe(
      "a \\[x\\]\\(javascript:1\\) \\*b\\* \\| \\`c\\` \\<script\\>",
    );
  });
});
