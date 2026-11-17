import type { Post } from "../post.ts";
import { escapeMarkdown, markdownUrl } from "../text.ts";

/** Builds a Markdown link only when the URL has a safe, absolute scheme. */
function markdownLink(label: string, url: string): string | undefined {
  const href = markdownUrl(url);
  return href === undefined ? undefined : `[${escapeMarkdown(label)}](${href})`;
}

export function toMarkdown(post: Post): string {
  const lines: string[] = [];
  const authorLink = markdownLink(`@${post.author.screenName}`, post.author.url);

  lines.push(`# X post by @${escapeMarkdown(post.author.screenName || "unknown")}`);
  lines.push("");
  lines.push(
    `- **Author**: ${escapeMarkdown(post.author.name)}${authorLink ? ` (${authorLink})` : ""}`,
  );
  lines.push(`- **Posted**: ${escapeMarkdown(post.createdAtIso ?? post.createdAt)}`);
  const url = markdownUrl(post.url);
  if (url) lines.push(`- **URL**: ${url}`);
  if (post.lang) lines.push(`- **Language**: ${escapeMarkdown(post.lang)}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(escapeMarkdown(post.text));
  lines.push("");
  lines.push("## Metrics");
  lines.push("");
  lines.push("| Metric  | Count |");
  lines.push("| ------- | ----- |");
  lines.push(`| Likes   | ${post.metrics.likes} |`);
  lines.push(`| Reposts | ${post.metrics.reposts} |`);
  lines.push(`| Quotes  | ${post.metrics.quotes} |`);
  lines.push(`| Replies | ${post.metrics.replies} |`);
  lines.push(`| Views   | ${post.metrics.views ?? "-"} |`);

  let mediaCount = 0;
  for (const item of post.media) {
    const href = markdownUrl(item.url);
    if (href === undefined) continue;
    mediaCount++;

    if (mediaCount === 1) {
      lines.push("");
      lines.push("## Media");
      lines.push("");
    }

    if (item.type === "photo") {
      const alt = item.altText ? escapeMarkdown(item.altText.replace(/\s*\n\s*/g, " ")) : "";
      lines.push(`${mediaCount}. ![${alt}](${href})`);
    } else {
      const label = item.type === "gif" ? "GIF" : "Video";
      lines.push(`${mediaCount}. [${label}](${href})`);
    }
  }

  if (post.quote) {
    lines.push("");
    lines.push("## Quoted post");
    lines.push("");
    for (const line of escapeMarkdown(post.quote.text).split("\n")) lines.push(`> ${line}`);
    lines.push(">");
    const quoteLink = markdownLink(`@${post.quote.authorScreenName}`, post.quote.url);
    if (quoteLink) lines.push(`> — ${quoteLink}`);
  }

  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}
