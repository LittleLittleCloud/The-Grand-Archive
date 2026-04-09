import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { searchRoutes } from "./routes/search";
import { feedsRoutes } from "./routes/feeds";
import { statsRoutes } from "./routes/stats";
import { ingestRoutes } from "./routes/ingest";
import { authRoutes } from "./routes/auth";
import { errorHandler } from "./middleware/error";
import { tierMiddleware } from "./middleware/tier";
import { initDb } from "./db/client";
import { buildSearchIndex } from "./search/engine";

const app = new Hono();

// Global middleware
app.use("*", cors());
app.use("/api/*", tierMiddleware());
app.onError(errorHandler);

// Routes
app.route("/api", searchRoutes);
app.route("/api", feedsRoutes);
app.route("/api", statsRoutes);
app.route("/api", ingestRoutes);
app.route("/api", authRoutes);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Serve UI static files in production
const staticDir = process.env.STATIC_DIR;
if (staticDir) {
  app.use("/*", serveStatic({ root: staticDir + "/" }));
  // SPA fallback: serve index.html for non-API, non-file routes
  app.get("*", serveStatic({ path: staticDir + "/index.html" }));
}

// Bootstrap
const port = parseInt(process.env.PORT ?? "3000", 10);

async function main() {
  initDb();
  await buildSearchIndex();
  console.log(`🗄️  大案牍库 server listening on port ${port}`);
}

main();

export default {
  port,
  hostname: "0.0.0.0",
  fetch: app.fetch,
};

// Export app for testing
export { app };
