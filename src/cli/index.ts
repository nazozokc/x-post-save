import { io } from "../io.ts";
import { renderHelp } from "./help.ts";
import { resolveArgs, toContext, tokenize } from "./parser.ts";
import type { ArgDefinitions, Command } from "./types.ts";

export { define } from "./types.ts";
export { renderHelp, renderUsage } from "./help.ts";
export { resolveArgs, tokenize } from "./parser.ts";
export type { ArgDefinition, ArgDefinitions, Command, CommandContext } from "./types.ts";

/**
 * Runs a single command. `--help` / `--version` are handled before parsing so
 * they always work, even with otherwise invalid input.
 */
export async function cli<A extends ArgDefinitions>(
  argv: string[],
  command: Command<A>,
  version: string,
): Promise<void> {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(renderHelp(command, version));
    return;
  }
  if (argv.includes("--version") || argv.includes("-V")) {
    process.stdout.write(`${version}\n`);
    return;
  }

  const result = resolveArgs(tokenize(argv), command.args);
  if (result.errors.length > 0) {
    for (const error of result.errors) io.error(error);
    io.hint(`run '${command.name} --help' for usage`);
    process.exitCode = 1;
    return;
  }

  await command.run(toContext(result));
}
