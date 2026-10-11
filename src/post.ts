import { ApiError } from "./api.ts";

export type MediaType = "photo" | "video" | "gif";

export interface MediaItem {
  type: MediaType;
  url: string;
  altText?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  duration?: number;
}

export interface PostAuthor {
  id: string;
  name: string;
  screenName: string;
  url: string;
  avatarUrl: string | null;
  description: string;
  followers: number;
  following: number;
  joined: string | null;
}

export interface PostMetrics {
  likes: number;
  reposts: number;
  quotes: number;
  replies: number;
  views: number | null;
}

export interface QuotedPost {
  id: string;
  url: string;
  text: string;
  authorName: string;
  authorScreenName: string;
}

export interface Post {
  id: string;
  url: string;
  text: string;
  lang: string | null;
  createdAt: string;
  createdAtIso: string | null;
  createdAtTimestamp: number;
  author: PostAuthor;
  metrics: PostMetrics;
  media: MediaItem[];
  quote: QuotedPost | null;
}

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const nullableStr = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

const num = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const nullableNum = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function extractMessage(payload: Json): string | null {
  if (typeof payload.message === "string") return payload.message;
  const status = payload.status;
  if (isRecord(status)) {
    if (typeof status.message === "string") return status.message;
    if (typeof status.reason === "string") return `post is unavailable (${status.reason})`;
  }
  return null;
}

function toMediaItem(raw: Json): MediaItem | null {
  const url = str(raw.url);
  if (!url) return null;

  const typeRaw = str(raw.type, "photo");
  const type: MediaType =
    typeRaw === "video" || typeRaw === "gif" ? typeRaw : "photo";

  const item: MediaItem = { type, url };
  const alt = nullableStr(raw.altText);
  if (alt) item.altText = alt;
  const width = nullableNum(raw.width);
  if (width !== null) item.width = width;
  const height = nullableNum(raw.height);
  if (height !== null) item.height = height;
  const thumb = nullableStr(raw.thumbnail_url);
  if (thumb) item.thumbnailUrl = thumb;
  const duration = nullableNum(raw.duration);
  if (duration !== null) item.duration = duration;
  return item;
}

function toMedia(status: Json): MediaItem[] {
  const media = isRecord(status.media) ? status.media : undefined;
  if (!media) return [];

  const all = Array.isArray(media.all) ? media.all : undefined;
  const source = all ?? [
    ...(Array.isArray(media.photos) ? media.photos : []),
    ...(Array.isArray(media.videos) ? media.videos : []),
  ];

  const items: MediaItem[] = [];
  for (const entry of source) {
    if (!isRecord(entry)) continue;
    const item = toMediaItem(entry);
    if (item) items.push(item);
  }
  return items;
}

function toAuthor(raw: unknown): PostAuthor {
  const author = isRecord(raw) ? raw : {};
  return {
    id: str(author.id),
    name: str(author.name),
    screenName: str(author.screen_name),
    url: str(author.url),
    avatarUrl: nullableStr(author.avatar_url),
    description: str(author.description),
    followers: num(author.followers),
    following: num(author.following),
    joined: nullableStr(author.joined),
  };
}

function toQuotedPost(raw: unknown): QuotedPost | null {
  if (!isRecord(raw) || raw.type !== "status") return null;
  const author = isRecord(raw.author) ? raw.author : {};
  return {
    id: str(raw.id),
    url: str(raw.url),
    text: str(raw.text),
    authorName: str(author.name),
    authorScreenName: str(author.screen_name),
  };
}

/** Maps a raw FxTwitter payload onto the curated {@link Post} model. */
export function normalize(payload: unknown): Post {
  if (!isRecord(payload)) throw new ApiError("unexpected API response");

  const code = num(payload.code, 200);
  if (code !== 200) {
    throw new ApiError(extractMessage(payload) ?? `API error (code ${code})`, code);
  }

  const status = payload.status;
  if (!isRecord(status)) throw new ApiError("API response is missing post data");

  if (status.type !== "status") {
    throw new ApiError(extractMessage(payload) ?? "post is unavailable");
  }

  const timestamp = num(status.created_timestamp);
  const createdAtIso =
    timestamp > 0 ? new Date(timestamp * 1000).toISOString() : null;

  return {
    id: str(status.id),
    url: str(status.url),
    text: str(status.text),
    lang: nullableStr(status.lang),
    createdAt: str(status.created_at),
    createdAtIso,
    createdAtTimestamp: timestamp,
    author: toAuthor(status.author),
    metrics: {
      likes: num(status.likes),
      reposts: num(status.reposts),
      quotes: num(status.quotes),
      replies: num(status.replies),
      views: nullableNum(status.views),
    },
    media: toMedia(status),
    quote: toQuotedPost(status.quote),
  };
}
