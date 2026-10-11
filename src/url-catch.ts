import { consola } from "consola";
import { savePost } from "./save";

export const urlcatch = async (url: string, dir: string): Promise<void> => {
  const newurl = new URL(url);
  const parts = newurl.pathname.split("/");

  const username = parts[1];
  const postId = parts[3];

  const urlfetch = await fetch(
    `https://api.fxtwitter.com/${username}/status/${postId}`,
  );

  if (!urlfetch.ok) {
    consola.error("Failed to get the post");
  }

  const jsoncatch = urlfetch.json();

  savePost(dir, jsoncatch);
};
