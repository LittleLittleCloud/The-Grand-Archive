import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/AGENTS.md": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/agents.md": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/robots.txt": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/sitemap.xml": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
