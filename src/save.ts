import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Post } from "./post.ts";
import type { Format } from "./serialize.ts";

const EXTENSION: Record<Format, string> = {
  json: "json",
  md: "md",
  toml: "toml",
  yaml: "yaml",
};

/** Writes `content` to `<dir>/<screenName>-<id>.<ext>` and returns the absolute path. */
export async function save(
  dir: string,
  post: Post,
  format: Format,
  content: string,
): Promise<string> {
  const target = resolve(dir);
  await mkdir(target, { recursive: true });

  // API-controlled values must never become path components. Keep the output
  // filename deterministic and confined to the selected directory.
  const id = /^\d{2,20}$/.test(post.id) ? post.id : "post";
  const path = join(target, `${id}.${EXTENSION[format]}`);
  await Bun.write(path, content);
  return path;
}
