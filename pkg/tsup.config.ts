import { defineConfig } from "tsup";

export default defineConfig([
  // Library entry points
  {
    entry: {
      index: "src/index.ts",
      feeds: "src/feeds.ts",
      search: "src/search.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: true,
    external: ["fs", "path", "url"],
    noExternal: ["minisearch"],
  },
  // CLI entry point
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    banner: { js: "#!/usr/bin/env node" },
    sourcemap: true,
    external: ["fs", "path", "url"],
    noExternal: ["minisearch"],
  },
]);
