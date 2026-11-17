import type { Post } from "../post.ts";

export function toJson(post: Post): string {
  return `${JSON.stringify(post, null, 2)}\n`;
}
