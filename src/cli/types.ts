export type ArgType = "string" | "boolean" | "number";

export interface ArgDefinition {
  /** Value kind expected on the command line. */
  type: ArgType;
  /** Fails parsing when absent (and no default is set). */
  required?: boolean;
  /** Fallback used when the option is not provided. */
  default?: string | number | boolean;
  /** Alternative long name, e.g. `output` for `--out`. */
  alias?: string;
  /** Single-character short flag, e.g. `o` for `-o`. */
  short?: string;
  /** Placeholder shown in help for value-taking options. */
  placeholder?: string;
  /** One-line description shown in help. */
  description?: string;
}

export type ArgDefinitions = Record<string, ArgDefinition>;

export type ArgValue<D extends ArgDefinition> = D["type"] extends "boolean"
  ? boolean
  : D["type"] extends "number"
    ? number
    : string;

export type Values<A extends ArgDefinitions> = {
  [K in keyof A]: ArgValue<A[K]>;
};

export interface CommandContext<A extends ArgDefinitions> {
  values: Values<A>;
  positionals: string[];
}

export interface Command<A extends ArgDefinitions = ArgDefinitions> {
  name: string;
  description: string;
  /** Usage tail after the command name, e.g. `<url> [options]`. */
  usage?: string;
  args: A;
  examples?: string[];
  run: (ctx: CommandContext<A>) => void | Promise<void>;
}

/** The data-only view of a command (no `run`), used by help rendering. */
export type CommandLike = Pick<
  Command<ArgDefinitions>,
  "name" | "description" | "usage" | "args" | "examples"
>;

/** Identity helper that gives `define({...})` its inferred generic shape. */
export function define<A extends ArgDefinitions>(command: Command<A>): Command<A> {
  return command;
}
