export interface PostRef {
  id: string;
  screenName?: string;
}

const SNOWFLAKE = /^\d{2,20}$/;
const HTTP_PREFIX = /^https?:\/\//i;
const HOST_PREFIXES = ["www.", "mobile."];

/**
 * Accepts a bare snowflake id or an x.com / twitter.com status URL
 * (with or without a screen name, including `/i/web/status/<id>` links).
 *
 * Only http(s) is considered. Anything else is forced through an https
 * prefix so an alternate scheme cannot be used to smuggle a host past checks.
 */
export function parsePostRef(input: string): PostRef | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  if (SNOWFLAKE.test(trimmed)) return { id: trimmed };

  let url: URL;
  try {
    url = new URL(HTTP_PREFIX.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  let host = url.hostname.toLowerCase();
  for (let i = 0; i < HOST_PREFIXES.length * 2; i++) {
    const prefix = HOST_PREFIXES.find((item) => host.startsWith(item));
    if (!prefix) break;
    host = host.slice(prefix.length);
  }
  if (host !== "x.com" && host !== "twitter.com") return null;

  const match = url.pathname.match(/\/status(?:es)?\/(\d{2,20})(?=\/|$)/);
  const id = match?.[1];
  if (!id) return null;

  const first = url.pathname.split("/").filter(Boolean)[0];
  const screenName = first && first !== "i" && first !== "web" ? first : undefined;
  return screenName ? { id, screenName } : { id };
}
