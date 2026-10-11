export interface PostRef {
  id: string;
  screenName?: string;
}

const SNOWFLAKE = /^\d{2,20}$/;

/**
 * Accepts a bare snowflake id or an x.com / twitter.com status URL
 * (with or without a screen name, including `/i/web/status/<id>` links).
 */
export function parsePostRef(input: string): PostRef | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  if (SNOWFLAKE.test(trimmed)) return { id: trimmed };

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").replace(/^mobile\./, "");
  if (host !== "x.com" && host !== "twitter.com") return null;

  const match = url.pathname.match(/\/status(?:es)?\/(\d{2,20})/);
  const id = match?.[1];
  if (!id) return null;

  const first = url.pathname.split("/").filter(Boolean)[0];
  const screenName = first && first !== "i" && first !== "web" ? first : undefined;
  return screenName ? { id, screenName } : { id };
}
