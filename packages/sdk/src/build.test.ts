import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("SDK package.json", () => {
  const pkgPath = join(import.meta.dir, "../package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

  test("should not have workspace: protocol in dependencies", () => {
    const deps = pkg.dependencies ?? {};
    for (const [name, version] of Object.entries(deps)) {
      expect(version).not.toMatch(
        /^workspace:/,
      );
    }
  });
});
