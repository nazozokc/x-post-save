import type { Post } from "../post.ts";
import { toJson } from "./json.ts";
import { toMarkdown } from "./markdown.ts";
import { toToml } from "./toml.ts";
import { toYaml } from "./yaml.ts";

export const FORMATS = ["json", "md", "toml", "yaml"] as const;

export type Format = (typeof FORMATS)[number];

export function isFormat(value: string): value is Format {
  return (FORMATS as readonly string[]).includes(value);
}

/** Serializes a post into one of the supported output formats. */
export function serialize(post: Post, format: Format): string {
  switch (format) {
    case "json":
      return toJson(post);
    case "md":
      return toMarkdown(post);
    case "toml":
      return toToml(post);
    case "yaml":
      return toYaml(post);
  }
}
