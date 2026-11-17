#!/usr/bin/env bun
import { cli } from "./cli/index.ts";
import { command } from "./command.ts";
import { version } from "./version.ts";

await cli(process.argv.slice(2), command, await version());
