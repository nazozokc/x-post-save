import { describe, expect, test } from "bun:test";
import type { Post } from "./post.ts";
import { FORMATS, isFormat, serialize } from "./serialize.ts";

const sample: Post = {
  id: "20",
  url: "https://x.com/jack/status/20",
  text: "hello: world\nsecond line",
  lang: "en",
  createdAt: "Tue Mar 21 20:50:14 +0000 2006",
  createdAtIso: "2006-03-21T20:50:14.000Z",
  createdAtTimestamp: 1142974214,
  author: {
    id: "12",
    name: "jack",
    screenName: "jack",
    url: "https://x.com/jack",
    avatarUrl: "https://pbs.twimg.com/profile_images/x.jpg",
    description: "no state is the best state",
    followers: 12502474,
    following: 3,
    joined: "Tue Mar 21 20:50:14 +0000 2006",
  },
  metrics: { likes: 311827, reposts: 124603, quotes: 7287, replies: 18075, views: null },
  media: [
    {
      type: "photo",
      url: "https://pbs.twimg.com/media/a.jpg",
      altText: "a star",
      width: 2048,
      height: 1911,
    },
    {
      type: "video",
      url: "https://video.twimg.com/x.mp4",
      width: 1280,
      height: 720,
      thumbnailUrl: "https://pbs.twimg.com/t.jpg",
      duration: 12.5,
    },
  ],
  quote: {
    id: "99",
    url: "https://x.com/other/status/99",
    text: "quoted",
    authorName: "Other",
    authorScreenName: "other",
  },
};

function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNulls);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === null || entry === undefined) continue;
      out[key] = stripNulls(entry);
    }
    return out;
  }
  return value;
}

describe("isFormat", () => {
  test("accepts only the four supported formats", () => {
    for (const format of FORMATS) expect(isFormat(format)).toBe(true);
    expect(isFormat("xml")).toBe(false);
  });
});

describe("serialize", () => {
  test("json round-trips the model", () => {
    const output = serialize(sample, "json");
    expect(output.endsWith("\n")).toBe(true);
    expect(JSON.parse(output)).toEqual(sample);
  });

  test("toml is valid and drops null fields", () => {
    const output = serialize(sample, "toml");
    const parsed = Bun.TOML.parse(output) as unknown;
    expect(parsed).toEqual(stripNulls(sample));
  });

  test("yaml is valid and preserves the model", () => {
    const output = serialize(sample, "yaml");
    const parsed = Bun.YAML.parse(output) as unknown;
    expect(parsed).toEqual(sample);
  });

  test("render yaml shape", () => {
    const output = serialize(sample, "yaml");
    // multi-line text becomes a literal block scalar
    expect(output).toContain("text: |-");
    expect(output).toContain("  - type: photo");
    expect(output).toContain("quote:");
  });

  test("markdown highlights the post", () => {
    const output = serialize(sample, "md");
    expect(output).toContain("# X post by @jack");
    expect(output).toContain("https://x.com/jack/status/20");
    expect(output).toContain("| Likes   | 311827 |");
    expect(output).toContain("![a star](https://pbs.twimg.com/media/a.jpg)");
    expect(output).toContain("## Quoted post");
  });
});
