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
      "/llms.txt": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/openapi.json": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/docs": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/entry/": {
        target: "http://localhost:3000",
        changeOrigin: true,
        bypass: (req) => {
          // Only proxy requests that end with .md
          if (req.url && req.url.endsWith(".md")) {
            return undefined; // Handled by proxy
          }
          return req.url; // Bypass proxy and handle by Vite
        },
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
