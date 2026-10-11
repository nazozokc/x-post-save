import { describe, expect, test } from "bun:test";
import { ApiError } from "./api.ts";
import { normalize } from "./post.ts";

const payload = {
  code: 200,
  status: {
    type: "status",
    id: "20",
    url: "https://x.com/jack/status/20",
    text: "just setting up my twttr",
    created_at: "Tue Mar 21 20:50:14 +0000 2006",
    created_timestamp: 1142974214,
    likes: 311827,
    reposts: 124603,
    quotes: 7287,
    replies: 18075,
    lang: "en",
    views: null,
    author: {
      type: "profile",
      id: "12",
      name: "jack",
      screen_name: "jack",
      url: "https://x.com/jack",
      avatar_url: "https://pbs.twimg.com/profile_images/x.jpg",
      description: "no state is the best state",
      followers: 12502474,
      following: 3,
      joined: "Tue Mar 21 20:50:14 +0000 2006",
    },
    media: {
      all: [
        {
          type: "photo",
          url: "https://pbs.twimg.com/media/a.jpg",
          width: 2048,
          height: 1911,
          altText: "a star",
        },
      ],
    },
    quote: {
      type: "status",
      id: "99",
      url: "https://x.com/other/status/99",
      text: "quoted",
      author: { name: "Other", screen_name: "other" },
    },
  },
};

describe("normalize", () => {
  test("maps the api payload onto the curated model", () => {
    const post = normalize(payload);
    expect(post.id).toBe("20");
    expect(post.createdAtIso).toBe("2006-03-21T20:50:14.000Z");
    expect(post.author.screenName).toBe("jack");
    expect(post.metrics.views).toBeNull();
    expect(post.media).toEqual([
      { type: "photo", url: "https://pbs.twimg.com/media/a.jpg", width: 2048, height: 1911, altText: "a star" },
    ]);
    expect(post.quote).toEqual({
      id: "99",
      url: "https://x.com/other/status/99",
      text: "quoted",
      authorName: "Other",
      authorScreenName: "other",
    });
  });

  test("throws on an api error code", () => {
    const error = (() => {
      try {
        normalize({ code: 400, message: "id: tweet ID must be a numeric snowflake" });
        return null;
      } catch (err) {
        return err;
      }
    })();
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe("id: tweet ID must be a numeric snowflake");
  });

  test("throws on a tombstone status", () => {
    expect(() =>
      normalize({
        code: 200,
        status: { type: "tombstone", reason: "deleted", message: "This post is unavailable" },
      }),
    ).toThrow(ApiError);
  });
});
