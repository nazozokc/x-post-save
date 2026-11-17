import { afterEach, describe, expect, test } from "bun:test";
import { cli } from "./index.ts";
import { define } from "./types.ts";

let ran = 0;
let stdout = "";
let originalWrite: typeof process.stdout.write;
let originalStderr: typeof process.stderr.write;

const command = define({
  name: "test",
  description: "test command",
  args: {
    out: { type: "string", short: "o", default: "." },
  },
  run: () => {
    ran++;
  },
});

const runCli = async (argv: string[]): Promise<void> => {
  const originalExitCode = process.exitCode;
  stdout = "";
  ran = 0;
  originalWrite = process.stdout.write;
  originalStderr = process.stderr.write;
  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = (() => true) as typeof process.stderr.write;
  try {
    await cli(argv, command, "9.9.9");
  } finally {
    process.stdout.write = originalWrite;
    process.stderr.write = originalStderr;
    process.exitCode = originalExitCode;
  }
};

afterEach(() => {
  process.stdout.write = originalWrite ?? process.stdout.write;
  process.stderr.write = originalStderr ?? process.stderr.write;
});

describe("cli meta flags", () => {
  test("shows help and version when they are real options", async () => {
    await runCli(["--help"]);
    expect(stdout).toContain("test command");
    expect(ran).toBe(0);

    await runCli(["-V"]);
    expect(stdout).toBe("9.9.9\n");
    expect(ran).toBe(0);
  });

  test("treats tokens after -- as positional", async () => {
    await runCli(["--", "--help"]);
    expect(stdout).toBe("");
    expect(ran).toBe(1);
  });

  test("does not treat a value-taking option's next token as a flag", async () => {
    await runCli(["-o", "-h"]);
    expect(stdout).toBe("");
    expect(ran).toBe(0);
  });
});
