import type { Post } from "../post.ts";
import { type JsonObject, isPlainObject } from "./shared.ts";

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

/**
 * A literal block with an explicit indentation indicator: leading spaces in
 * post text must survive round-trips, so the parser cannot infer indentation
 * from the first non-empty line. `|+` retains every trailing line break.
 */
function blockLines(value: string): { header: string; lines: string[] } {
  const trailing = value.endsWith("\n");
  const lines = value.split("\n");
  if (trailing) lines.pop();
  return { header: trailing ? "|2+" : "|2-", lines };
}

/**
 * Appends a block scalar. `label` is the map key (e.g. `text:`) or the array
 * dash (`-`) that introduces the scalar. CR is emitted as a quoted scalar
 * because YAML normalises line breaks inside literal blocks.
 */
function emitBlockScalar(lines: string[], label: string, value: string, indent: number): void {
  const pad = " ".repeat(indent);
  if (value.includes("\r")) {
    lines.push(`${pad}${label} ${JSON.stringify(value)}`);
    return;
  }

  const { header, lines: content } = blockLines(value);
  lines.push(`${pad}${label} ${header}`);
  const bodyPad = " ".repeat(indent + 2);
  for (const line of content) lines.push(line === "" ? "" : bodyPad + line);
}

function emitYamlMap(obj: JsonObject, indent: number): string[] {
  const pad = " ".repeat(indent);
  const lines: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;

    if (typeof value === "string" && value.includes("\n")) {
      emitBlockScalar(lines, `${key}:`, value, indent);
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
      emitBlockScalar(lines, "-", item, indent);
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

export function toYaml(post: Post): string {
  return `${emitYamlMap(post as unknown as JsonObject, 0).join("\n")}\n`;
}
