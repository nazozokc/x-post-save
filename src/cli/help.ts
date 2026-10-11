import type { ArgDefinition, CommandLike } from "./types.ts";

function signature(key: string, def: ArgDefinition): string {
  const short = def.short ? `-${def.short}, ` : "";
  const value = def.type === "boolean" ? "" : ` <${def.placeholder ?? def.type}>`;
  return `${short}--${key}${value}`;
}

export function renderUsage(command: CommandLike): string {
  const tail = command.usage ?? "[options]";
  return `${command.name} ${tail}`;
}

export function renderHelp(command: CommandLike, version: string): string {
  const rows: Array<[string, string]> = Object.entries(command.args).map(([key, def]) => {
    const defaultHint = def.default !== undefined ? ` (default: ${def.default})` : "";
    return [signature(key, def), `${def.description ?? ""}${defaultHint}`.trim()];
  });

  rows.push(["-h, --help", "Show this help"]);
  rows.push(["-V, --version", "Show the version"]);

  const width = rows.reduce((max, [left]) => Math.max(max, left.length), 0);
  const options = rows
    .map(([left, right]) => `  ${left.padEnd(width + 2)}${right}`.trimEnd())
    .join("\n");

  const lines = [
    `${command.name} — ${command.description}`,
    "",
    "Usage:",
    `  ${renderUsage(command)}`,
    "",
    "Options:",
    options,
  ];

  if (command.examples?.length) {
    lines.push("", "Examples:");
    for (const example of command.examples) lines.push(`  ${example}`);
  }

  lines.push("", `Version ${version}`);
  return lines.join("\n") + "\n";
}
