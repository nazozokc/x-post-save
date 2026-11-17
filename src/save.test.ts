import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Post } from "./post.ts";
import { save } from "./save.ts";

const post = (id: string, screenName: string): Post => ({
  id,
  url: "https://x.com/user/status/20",
  text: "post",
  lang: null,
  createdAt: "",
  createdAtIso: null,
  createdAtTimestamp: 0,
  author: {
    id: "1", name: "User", screenName, url: "", avatarUrl: null,
    description: "", followers: 0, following: 0, joined: null,
  },
  metrics: { likes: 0, reposts: 0, quotes: 0, replies: 0, views: null },
  media: [],
  quote: null,
});

describe("save", () => {
  let dir = "";
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
    dir = "";
  });

  test("uses a validated post id instead of API-controlled path components", async () => {
    dir = await mkdtemp(join(tmpdir(), "x-post-save-"));
    const path = await save(dir, post("../../escape", "../../victim"), "json", "safe");
    expect(path).toBe(join(dir, "post.json"));
    expect(await readFile(path, "utf8")).toBe("safe");
  });

  test("preserves numeric post ids in filenames", async () => {
    dir = await mkdtemp(join(tmpdir(), "x-post-save-"));
    expect(await save(dir, post("123456", "attacker"), "md", "safe")).toBe(
      join(dir, "123456.md"),
    );
  });

  test("refuses to write through a symlink", async () => {
    dir = await mkdtemp(join(tmpdir(), "x-post-save-"));
    const victim = join(dir, "victim.txt");
    await writeFile(victim, "ORIGINAL");
    await symlink(victim, join(dir, "20.json"));

    let message = "";
    try {
      await save(dir, post("20", "user"), "json", "OVERWRITTEN");
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("non-regular path");
    expect(await readFile(victim, "utf8")).toBe("ORIGINAL");
  });

  test("overwrites a regular file and leaves no temporary files", async () => {
    dir = await mkdtemp(join(tmpdir(), "x-post-save-"));
    const path = join(dir, "20.json");
    await writeFile(path, "OLD");

    expect(await save(dir, post("20", "user"), "json", "NEW")).toBe(path);
    expect(await readFile(path, "utf8")).toBe("NEW");
    expect(await readdir(dir)).toEqual(["20.json"]);
  });
});
