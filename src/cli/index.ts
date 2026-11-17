import { io } from "../io.ts";
import { renderHelp } from "./help.ts";
import { resolveArgs, toContext, tokenize, type Token } from "./parser.ts";
import type { ArgDefinition, ArgDefinitions, Command } from "./types.ts";

export { define } from "./types.ts";
export { renderHelp, renderUsage } from "./help.ts";
export { resolveArgs, tokenize } from "./parser.ts";
export type { ArgDefinition, ArgDefinitions, Command, CommandContext } from "./types.ts";

/**
 * Finds a meta flag among option tokens only. Tokens after `--` are positional,
 * and a token consumed as the value of a preceding option is not a flag.
 */
function hasMetaFlag(tokens: Token[], long: string, short: string, defs: ArgDefinitions): boolean {
  const lookup = new Map<string, ArgDefinition>();
  for (const [key, def] of Object.entries(defs)) {
    lookup.set(key, def);
    if (def.alias) lookup.set(def.alias, def);
    if (def.short) lookup.set(def.short, def);
  }

  let expectValue = false;
  for (const token of tokens) {
    if (expectValue) {
      expectValue = false;
      continue;
    }
    if (token.kind === "positional") continue;

    if (token.kind === "long" ? token.name === long : token.name === short) return true;

    const def = lookup.get(token.name);
    if (def && def.type !== "boolean" && token.value === undefined) expectValue = true;
  }
  return false;
}

/**
 * Runs a single command. `--help` / `--version` are handled before validation
 * so they always work, but only where they are genuinely option tokens.
 */
export async function cli<A extends ArgDefinitions>(
  argv: string[],
  command: Command<A>,
  version: string,
): Promise<void> {
  const tokens = tokenize(argv);

  if (hasMetaFlag(tokens, "help", "h", command.args)) {
    process.stdout.write(renderHelp(command, version));
    return;
  }
  if (hasMetaFlag(tokens, "version", "V", command.args)) {
    process.stdout.write(`${version}\n`);
    return;
  }

  const result = resolveArgs(tokens, command.args);
  if (result.errors.length > 0) {
    for (const error of result.errors) io.error(error);
    io.hint(`run '${command.name} --help' for usage`);
    process.exitCode = 1;
    return;
  }

  await command.run(toContext(result));
}
