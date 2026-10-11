import type { ArgDefinition, ArgDefinitions, CommandContext, Values } from "./types.ts";

export type Token =
  | { kind: "long"; name: string; value?: string }
  | { kind: "short"; name: string; value?: string }
  | { kind: "positional"; value: string };

/**
 * Splits argv into option tokens (long/short, inline `=value` supported) and
 * positionals. Everything after a bare `--` is treated as positional.
 */
export function tokenize(argv: string[]): Token[] {
  const tokens: Token[] = [];
  let literal = false;

  for (const arg of argv) {
    if (literal) {
      tokens.push({ kind: "positional", value: arg });
      continue;
    }
    if (arg === "--") {
      literal = true;
      continue;
    }
    if (arg.startsWith("--")) {
      const body = arg.slice(2);
      const eq = body.indexOf("=");
      tokens.push(
        eq >= 0
          ? { kind: "long", name: body.slice(0, eq), value: body.slice(eq + 1) }
          : { kind: "long", name: body },
      );
      continue;
    }
    if (arg.startsWith("-") && arg.length > 1) {
      const body = arg.slice(1);
      const eq = body.indexOf("=");
      tokens.push(
        eq >= 0
          ? { kind: "short", name: body.slice(0, eq), value: body.slice(eq + 1) }
          : { kind: "short", name: body },
      );
      continue;
    }
    tokens.push({ kind: "positional", value: arg });
  }

  return tokens;
}

export interface ParseResult<A extends ArgDefinitions> {
  values: Values<A>;
  positionals: string[];
  errors: string[];
}

function parseBoolean(raw: string): boolean | undefined {
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return undefined;
}

/** Resolves tokens against the arg schema, collecting every error instead of throwing. */
export function resolveArgs<A extends ArgDefinitions>(
  tokens: Token[],
  defs: A,
): ParseResult<A> {
  const values: Record<string, string | number | boolean | undefined> = {};
  const positionals: string[] = [];
  const errors: string[] = [];

  const lookup = new Map<string, { key: string; def: ArgDefinition }>();
  for (const [key, def] of Object.entries(defs)) {
    lookup.set(key, { key, def });
    if (def.alias) lookup.set(def.alias, { key, def });
    if (def.short) lookup.set(def.short, { key, def });

    if (def.default !== undefined) values[key] = def.default;
    else if (def.type === "boolean") values[key] = false;
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.kind === "positional") {
      positionals.push(token.value);
      continue;
    }

    // `--no-x` negates a boolean only when `x` is a boolean option in this schema.
    let name = token.name;
    let negated = false;
    if (token.kind === "long" && name.startsWith("no-")) {
      const base = lookup.get(name.slice(3));
      if (base && base.def.type === "boolean") {
        name = name.slice(3);
        negated = true;
      }
    }

    const found = lookup.get(name);
    if (!found) {
      const prefix = token.kind === "long" ? "--" : "-";
      errors.push(`unknown option '${prefix}${token.name}'`);
      continue;
    }

    const { key, def } = found;

    if (def.type === "boolean") {
      if (negated) {
        values[key] = false;
        continue;
      }
      if (token.value !== undefined) {
        const parsed = parseBoolean(token.value);
        if (parsed === undefined) {
          errors.push(`option '--${name}' expects a boolean`);
          continue;
        }
        values[key] = parsed;
      } else {
        values[key] = true;
      }
      continue;
    }

    let raw = token.value;
    if (raw === undefined) {
      const next = tokens[i + 1];
      if (next && next.kind === "positional") {
        raw = next.value;
        i++;
      } else {
        errors.push(`option '--${name}' requires a value`);
        continue;
      }
    }

    if (def.type === "number") {
      const n = Number(raw);
      if (raw.trim() === "" || Number.isNaN(n)) {
        errors.push(`option '--${name}' expects a number`);
        continue;
      }
      values[key] = n;
    } else {
      values[key] = raw;
    }
  }

  for (const [key, def] of Object.entries(defs)) {
    if (!def.required) continue;
    const value = values[key];
    if (value === undefined || value === "") {
      errors.push(`option '--${key}' is required`);
    }
  }

  return { values: values as Values<A>, positionals, errors };
}

export function toContext<A extends ArgDefinitions>(result: ParseResult<A>): CommandContext<A> {
  return { values: result.values, positionals: result.positionals };
}
