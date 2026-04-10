import { defineConfig } from "tsup";

export default defineConfig({
  entry: { cli: "src/index.ts" },
  format: ["esm"],
  banner: { js: "#!/usr/bin/env node" },
  sourcemap: true,
  clean: true,
  noExternal: [/.*/],
});
