export const version = async (): Promise<string> => {
  const pkg = (await Bun.file(new URL("../package.json", import.meta.url)).json()) as {
    version: string;
  };
  return pkg.version;
};
