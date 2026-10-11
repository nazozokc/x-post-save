import { cli, define } from "gunshi";
import { version } from "./version.ts";
import { urlcatch } from "./url-catch.ts";

const command = define({
  name: "x-post-save",
  description: "A X post save local machine",
  version: await version(),
  args: {
    url: {
      type: "string",
      required: true,
    },
    dir: {
      type: "string",
      required: true,
    },
  },
  run: (ctx) => {
    const { url, dir } = ctx.values;

    urlcatch(url, dir);
  },
});

await cli(process.argv.slice(2), command);
