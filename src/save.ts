import { randomUUID } from "node:crypto";
import { lstat, mkdir, open, rename, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Post } from "./post.ts";
import type { Format } from "./serialize/index.ts";

const EXTENSION: Record<Format, string> = {
  json: "json",
  md: "md",
  toml: "toml",
  yaml: "yaml",
};

const ENOENT = "ENOENT";

/** Rejects symlinks and non-regular files at the destination path. */
async function assertWritablePath(path: string): Promise<void> {
  try {
    const stats = await lstat(path);
    if (!stats.isFile()) {
      throw new Error(`refusing to write through non-regular path: ${path}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== ENOENT) throw error;
  }
}

/**
 * Writes `content` to `<dir>/<id>.<ext>` and returns the absolute path.
 *
 * API-controlled values never become path components. The file is created
 * exclusively in a temporary name and renamed into place so a partial write
 * cannot leave a corrupted result, and symlinks at the destination are refused.
 */
export async function save(
  dir: string,
  post: Post,
  format: Format,
  content: string,
): Promise<string> {
  const target = resolve(dir);
  await mkdir(target, { recursive: true });

  const id = /^\d{2,20}$/.test(post.id) ? post.id : "post";
  const extension = EXTENSION[format];
  const path = join(target, `${id}.${extension}`);
  await assertWritablePath(path);

  const temp = join(target, `.${id}.${extension}.${process.pid}.${randomUUID()}.tmp`);
  try {
    const handle = await open(temp, "wx", 0o600);
    try {
      await handle.writeFile(content, "utf8");
    } finally {
      await handle.close();
    }
    await rename(temp, path);
  } catch (error) {
    await unlink(temp).catch(() => {});
    throw error;
  }

  return path;
}
