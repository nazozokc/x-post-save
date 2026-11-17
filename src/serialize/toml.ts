import type { Post } from "../post.ts";
import { type JsonObject, isPlainObject } from "./shared.ts";

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

export function toToml(post: Post): string {
  return `${emitToml(post as unknown as JsonObject, "").join("\n")}\n`;
}
