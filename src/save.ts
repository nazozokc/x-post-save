import { writeFile } from "node:fs/promises";

export const savePost = async (dir: string, saveposts: any): Promise<void> => {
  const stringify = JSON.stringify(saveposts, null, 2);
  await writeFile(dir, stringify, "utf-8");
};
