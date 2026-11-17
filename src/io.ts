import { sanitizeTerminal } from "./text.ts";

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
  info: (message: string): void =>
    write(process.stderr, wrap("36", "•") + ` ${sanitizeTerminal(message)}`),
  success: (message: string): void =>
    write(process.stderr, wrap("32", "✓") + ` ${sanitizeTerminal(message)}`),
  warn: (message: string): void =>
    write(process.stderr, wrap("33", "!") + ` ${sanitizeTerminal(message)}`),
  error: (message: string): void =>
    write(process.stderr, wrap("31", "✗") + ` ${sanitizeTerminal(message)}`),
  hint: (message: string): void =>
    write(process.stderr, wrap("2", `  ${sanitizeTerminal(message)}`)),
};
