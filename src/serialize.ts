import type { Post } from "./post.ts";

export const FORMATS = ["json", "md", "toml", "yaml"] as const;

export type Format = (typeof FORMATS)[number];

export function isFormat(value: string): value is Format {
  return (FORMATS as readonly string[]).includes(value);
}

export function serialize(post: Post, format: Format): string {
  switch (format) {
    case "json":
      return toJson(post);
    case "md":
      return toMarkdown(post);
    case "toml":
      return toToml(post);
    case "yaml":
      return toYaml(post);
  }
}

/* -------------------------------------------------------------------------- */
/* json                                                                        */
/* -------------------------------------------------------------------------- */

function toJson(post: Post): string {
  return `${JSON.stringify(post, null, 2)}\n`;
}

/* -------------------------------------------------------------------------- */
/* markdown                                                                    */
/* -------------------------------------------------------------------------- */

function toMarkdown(post: Post): string {
  const lines: string[] = [];

  lines.push(`# X post by @${post.author.screenName || "unknown"}`);
  lines.push("");
  lines.push(
    `- **Author**: ${post.author.name} ([@${post.author.screenName}](${post.author.url}))`,
  );
  lines.push(`- **Posted**: ${post.createdAtIso ?? post.createdAt}`);
  lines.push(`- **URL**: ${post.url}`);
  if (post.lang) lines.push(`- **Language**: ${post.lang}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(post.text);
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

  if (post.media.length > 0) {
    lines.push("");
    lines.push("## Media");
    lines.push("");
    post.media.forEach((item, index) => {
      if (item.type === "photo") {
        const alt = item.altText ? item.altText.replace(/\s*\n\s*/g, " ") : "";
        lines.push(`${index + 1}. ![${alt}](${item.url})`);
      } else {
        const label = item.type === "gif" ? "GIF" : "Video";
        lines.push(`${index + 1}. [${label}](${item.url})`);
      }
    });
  }

  if (post.quote) {
    lines.push("");
    lines.push("## Quoted post");
    lines.push("");
    for (const line of post.quote.text.split("\n")) lines.push(`> ${line}`);
    lines.push(">");
    lines.push(`> — [@${post.quote.authorScreenName}](${post.quote.url})`);
  }

  return `${lines.join("\n").replace(/\n+$/, "")}\n`;
}

/* -------------------------------------------------------------------------- */
/* toml                                                                        */
/* -------------------------------------------------------------------------- */

type JsonObject = Record<string, unknown>;

const isPlainObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function tomlKey(key: string): string {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key);
}

function tomlPrimitive(value: unknown): string {
  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return Number.isFinite(value) ? String(value) : "0";
    default:
      return JSON.stringify(String(value));
  }
}

function tomlValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(tomlValue).join(", ")}]`;
  if (isPlainObject(value)) {
    const parts = Object.entries(value)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${tomlKey(k)} = ${tomlValue(v)}`);
    return `{ ${parts.join(", ")} }`;
  }
  return tomlPrimitive(value);
}

function emitToml(obj: JsonObject, prefix: string): string[] {
  const lines: string[] = [];
  const tables: Array<[string, JsonObject]> = [];
  const arrayTables: Array<[string, JsonObject[]]> = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      if (value.length > 0 && value.every(isPlainObject)) {
        arrayTables.push([key, value]);
        continue;
      }
      lines.push(`${tomlKey(key)} = ${tomlValue(value)}`);
      continue;
    }

    if (isPlainObject(value)) {
      if (Object.keys(value).length === 0) {
        lines.push(`${tomlKey(key)} = {}`);
        continue;
      }
      tables.push([key, value]);
      continue;
    }

    lines.push(`${tomlKey(key)} = ${tomlPrimitive(value)}`);
  }

  const section = (header: string, body: JsonObject, path: string): void => {
    if (lines.length > 0) lines.push("");
    lines.push(header);
    lines.push(...emitToml(body, path));
  };

  for (const [key, value] of tables) {
    const path = prefix ? `${prefix}.${tomlKey(key)}` : tomlKey(key);
    section(`[${path}]`, value, path);
  }

  for (const [key, items] of arrayTables) {
    const path = prefix ? `${prefix}.${tomlKey(key)}` : tomlKey(key);
    for (const item of items) section(`[[${path}]]`, item, path);
  }

  return lines;
}

function toToml(post: Post): string {
  return `${emitToml(post as unknown as JsonObject, "").join("\n")}\n`;
}

/* -------------------------------------------------------------------------- */
/* yaml                                                                        */
/* -------------------------------------------------------------------------- */

const YAML_RESERVED = /^(?:true|false|null|yes|no|on|off|~)$/i;
const YAML_PLAIN = /^(?!.*:(?:\s|$))(?!.*\s#)[A-Za-z0-9][A-Za-z0-9 _.\-/:@?=&%+]*$/;

function isPlainScalar(value: string): boolean {
  if (value === "" || YAML_RESERVED.test(value)) return false;
  if (/^[+-]?\d/.test(value) && !Number.isNaN(Number(value))) return false;
  return YAML_PLAIN.test(value);
}

function yamlScalar(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "string") return isPlainScalar(value) ? value : JSON.stringify(value);
  return JSON.stringify(value);
}

function blockHeader(value: string): { header: string; content: string } {
  const endsWithNewline = value.endsWith("\n");
  return {
    header: endsWithNewline ? "|" : "|-",
    content: endsWithNewline ? value.slice(0, -1) : value,
  };
}

function emitYamlMap(obj: JsonObject, indent: number): string[] {
  const pad = " ".repeat(indent);
  const lines: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;

    if (typeof value === "string" && value.includes("\n")) {
      const { header, content } = blockHeader(value);
      lines.push(`${pad}${key}: ${header}`);
      const bodyPad = " ".repeat(indent + 2);
      for (const line of content.split("\n")) lines.push(line === "" ? "" : bodyPad + line);
      continue;
    }

    if (isPlainObject(value)) {
      if (Object.keys(value).length === 0) {
        lines.push(`${pad}${key}: {}`);
        continue;
      }
      lines.push(`${pad}${key}:`);
      lines.push(...emitYamlMap(value, indent + 2));
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${pad}${key}: []`);
        continue;
      }
      lines.push(`${pad}${key}:`);
      lines.push(...emitYamlArray(value, indent + 2));
      continue;
    }

    lines.push(`${pad}${key}: ${yamlScalar(value)}`);
  }

  return lines;
}

function emitYamlArray(items: unknown[], indent: number): string[] {
  const pad = " ".repeat(indent);
  const lines: string[] = [];

  for (const item of items) {
    if (typeof item === "string" && item.includes("\n")) {
      const { header, content } = blockHeader(item);
      lines.push(`${pad}- ${header}`);
      const bodyPad = " ".repeat(indent + 2);
      for (const line of content.split("\n")) lines.push(line === "" ? "" : bodyPad + line);
      continue;
    }

    if (isPlainObject(item)) {
      if (Object.keys(item).length === 0) {
        lines.push(`${pad}- {}`);
        continue;
      }
      const child = emitYamlMap(item, indent + 2);
      lines.push(`${pad}- ${child[0]!.slice(indent + 2)}`);
      lines.push(...child.slice(1));
      continue;
    }

    if (Array.isArray(item)) {
      lines.push(`${pad}-`);
      lines.push(...emitYamlArray(item, indent + 2));
      continue;
    }

    lines.push(`${pad}- ${yamlScalar(item)}`);
  }

  return lines;
}

function toYaml(post: Post): string {
  return `${emitYamlMap(post as unknown as JsonObject, 0).join("\n")}\n`;
}
