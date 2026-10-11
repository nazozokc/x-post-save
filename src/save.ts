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

  const owner = post.author.screenName || "post";
  const path = join(target, `${owner}-${post.id}.${EXTENSION[format]}`);
  await Bun.write(path, content);
  return path;
}
