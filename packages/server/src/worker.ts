import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { searchRoutes } from "./routes/search";
import { feedsRoutes } from "./routes/feeds";
import { statsRoutes } from "./routes/stats";
import { ingestRoutes } from "./routes/ingest";
import { authRoutes } from "./routes/auth";
import { digestRoutes } from "./routes/digest";
import { userDigestRoutes } from "./routes/user-digests";
import { seoRoutes, entryMetaMiddleware } from "./routes/seo";
import { errorHandler } from "./middleware/error";
import { tierMiddleware } from "./middleware/tier";
import { llmAgentMiddleware } from "./middleware/llm-agent";
import { createAuth } from "./auth/better-auth";
import type { HonoEnv } from "./types";

const app = new OpenAPIHono<HonoEnv>();

// Global middleware
app.use("*", cors());

// Better Auth handles /api/auth/* (per-request instance bound to env)
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return createAuth(c.env).handler(c.req.raw);
});

// Tier middleware for API routes (session + API key + rate limit)
app.use("/api/*", llmAgentMiddleware());
app.use("/api/*", tierMiddleware());
app.onError(errorHandler);

// API routes
app.route("/api", searchRoutes);
app.route("/api", feedsRoutes);
app.route("/api", statsRoutes);
app.route("/api", ingestRoutes);
app.route("/api", authRoutes);
app.route("/api", digestRoutes);
app.route("/api", userDigestRoutes);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Auto-generated OpenAPI spec from zod-openapi routes
app.doc31("/openapi.json", (c) => {
  const proto = c.req.header("x-forwarded-proto") ?? (c.req.url.startsWith("https") ? "https" : "http");
  const host = c.req.header("host") ?? "dak-news.com";
  return {
    openapi: "3.1.0",
    info: {
      title: "大案牍库 (The Grand Archive) API",
      description:
        "A real-time news database tracking 20+ authoritative sources across finance, geopolitics, tech, and social trending. Updated every 30 minutes.",
      version: "1.0.0",
    },
    servers: [{ url: `${proto}://${host}` }],
  };
});

// SEO routes (robots.txt, sitemap.xml, llms.txt, AGENTS.md, /entry/:id.md, /docs)
app.route("/", seoRoutes);

// Crawler meta injection for /entry/:id, /search, /feeds (reads the built shell
// from the ASSETS binding).
app.route("/", entryMetaMiddleware());

// Fallback: serve the real static asset if it exists, otherwise the SPA shell.
// (Pages runs this Worker for asset paths too, so we must pass them through.)
app.get("*", async (c) => {
  if (!c.env.ASSETS) return c.notFound();
  const assetRes = await c.env.ASSETS.fetch(new Request(new URL(c.req.url).toString()));
  if (assetRes.status !== 404) return assetRes;
  const shell = await c.env.ASSETS.fetch(new Request(new URL("/", c.req.url).toString()));
  return new Response(shell.body, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
});

export default app;

// Export app for testing
export { app };
