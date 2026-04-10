import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("CLI build output", () => {
  const distPath = join(import.meta.dir, "../dist/cli.js");

  test("should have exactly one shebang line", () => {
    const content = readFileSync(distPath, "utf-8");
    const lines = content.split("\n");

    // First line must be the shebang
    expect(lines[0]).toBe("#!/usr/bin/env node");

    // No other line should contain a shebang
    const shebangs = lines.filter((l) => l.startsWith("#!"));
    expect(shebangs).toHaveLength(1);
  });

  test("should be parseable by Node.js without syntax errors", async () => {
    const proc = Bun.spawn(["node", "--check", distPath], {
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(exitCode).toBe(0);
    expect(stderr).toBe("");
  });
});
