/**
 * Helpers for text that originates from the network. Nothing in this module
 * trusts its input: control characters are removed before terminal output,
 * URLs are scheme-checked, and Markdown metacharacters are escaped.
 */

/** C0/C1 controls (except tab), plus bidirectional text spoofing characters. */
const TERMINAL_CONTROL = /[\u0000-\u0008\u000A-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/** Replaces anything that could alter a terminal line with harmless spaces. */
export function sanitizeTerminal(value: string): string {
  return value.replace(TERMINAL_CONTROL, " ").replace(/ {2,}/g, " ").trim();
}

/** Accepts only absolute http(s) URLs without embedded credentials. */
export function safeUrl(value: string): string | undefined {
  if (value.trim() === "") return undefined;
  if (/[\u0000-\u001F\u007F]/.test(value)) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    if (url.username !== "" || url.password !== "") return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

/** A safe URL whose parentheses cannot terminate a Markdown link destination. */
export function markdownUrl(value: string): string | undefined {
  return safeUrl(value)?.replace(/[()]/g, (char) => (char === "(" ? "%28" : "%29"));
}

const MARKDOWN_SPECIAL = /[\\`*_{}\[\]()#+\-.!|>~<]/g;

/** Escapes characters that could start Markdown markup in inline contexts. */
export function escapeMarkdown(value: string): string {
  return value.replace(MARKDOWN_SPECIAL, "\\$&");
}
