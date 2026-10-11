#!/usr/bin/env bun
import { fetchStatus } from "./api.ts";
import { cli, define } from "./cli/index.ts";
import { io } from "./io.ts";
import { normalize } from "./post.ts";
import { save } from "./save.ts";
import { FORMATS, isFormat, serialize } from "./serialize.ts";
import { parsePostRef } from "./url.ts";
import { version } from "./version.ts";

const command = define({
  name: "x-post-save",
  description: "Save an X (Twitter) post to json, md, toml, or yaml",
  usage: "<url|id> [options]",
  args: {
    format: {
      type: "string",
      required: true,
      short: "f",
      placeholder: "format",
      description: `Output format (${FORMATS.join(", ")})`,
    },
    out: {
      type: "string",
      short: "o",
      placeholder: "dir",
      default: ".",
      description: "Directory to write the file into",
    },
  },
  examples: [
    "x-post-save https://x.com/jack/status/20 --format json --out ./posts",
    "x-post-save 20 -f yaml",
  ],
  run: async (ctx) => {
    const input = ctx.positionals[0];
    if (!input) {
      io.error("a post URL or id is required");
      io.hint("usage: x-post-save <url|id> --format <format>");
      process.exitCode = 1;
      return;
    }

    const format = ctx.values.format;
    if (!isFormat(format)) {
      io.error(`unknown format '${format}'`);
      io.hint(`available formats: ${FORMATS.join(", ")}`);
      process.exitCode = 1;
      return;
    }

    const ref = parsePostRef(input);
    if (!ref) {
      io.error(`could not read a post from '${input}'`);
      io.hint("expected an x.com / twitter.com status URL or a numeric id");
      process.exitCode = 1;
      return;
    }

    try {
      io.info(`fetching post ${ref.id}...`);
      const payload = await fetchStatus(ref.id);
      const post = normalize(payload);
      const content = serialize(post, format);
      const path = await save(ctx.values.out, post, format, content);
      io.success(`saved ${path}`);
    } catch (error) {
      io.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  },
});

await cli(process.argv.slice(2), command, await version());
