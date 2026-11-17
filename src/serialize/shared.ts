/** Structural helpers shared by the TOML and YAML emitters. */
export type JsonObject = Record<string, unknown>;

export const isPlainObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);
