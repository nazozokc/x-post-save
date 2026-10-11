const colorEnabled =
  process.env.NO_COLOR === undefined &&
  process.env.TERM !== "dumb" &&
  process.stdout.isTTY === true;

const wrap = (code: string, text: string): string =>
  colorEnabled ? `\u001b[${code}m${text}\u001b[0m` : text;

const write = (stream: NodeJS.WriteStream, line: string): void => {
  stream.write(`${line}\n`);
};

export const io = {
  info: (message: string): void => write(process.stderr, wrap("36", "•") + ` ${message}`),
  success: (message: string): void => write(process.stderr, wrap("32", "✓") + ` ${message}`),
  warn: (message: string): void => write(process.stderr, wrap("33", "!") + ` ${message}`),
  error: (message: string): void => write(process.stderr, wrap("31", "✗") + ` ${message}`),
  hint: (message: string): void => write(process.stderr, wrap("2", `  ${message}`)),
};
