import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The `dak: server` VS Code task serves the API (Worker) on 127.0.0.1:8788.
// Use 127.0.0.1 (not localhost) so the proxy doesn't try IPv6 ::1 first, since
// the Worker binds IPv4 only. Override with DAK_DEV_API for other backends.
const API_TARGET = process.env.DAK_DEV_API ?? "http://127.0.0.1:8788";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
      },
      "/AGENTS.md": {
        target: API_TARGET,
        changeOrigin: true,
      },
      "/agents.md": {
        target: API_TARGET,
        changeOrigin: true,
      },
      "/llms.txt": {
        target: API_TARGET,
        changeOrigin: true,
      },
      "/openapi.json": {
        target: API_TARGET,
        changeOrigin: true,
      },
      "/docs": {
        target: API_TARGET,
        changeOrigin: true,
      },
      "/entry/": {
        target: API_TARGET,
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
        target: API_TARGET,
        changeOrigin: true,
      },
      "/sitemap.xml": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
