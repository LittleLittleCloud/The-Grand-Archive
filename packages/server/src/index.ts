import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { searchRoutes } from "./routes/search";
import { feedsRoutes } from "./routes/feeds";
import { statsRoutes } from "./routes/stats";
import { ingestRoutes } from "./routes/ingest";
import { authRoutes } from "./routes/auth";
import { seoRoutes, entryMetaMiddleware } from "./routes/seo";
import { errorHandler } from "./middleware/error";
import { tierMiddleware } from "./middleware/tier";
import { initDb } from "./db/client";
import { buildSearchIndex } from "./search/engine";
import { auth } from "./auth/better-auth";
import { getMigrations } from "better-auth/db/migration";
import { Database } from "bun:sqlite";

const app = new OpenAPIHono();

// Global middleware
app.use("*", cors());

// Better Auth handles /api/auth/*
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  const req = c.req;
  console.log(`[auth] ${req.method} ${req.url}`);
  return auth.handler(req.raw);
});

// Tier middleware for API routes (session + API key + rate limit)
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

// Auto-generated OpenAPI spec from zod-openapi routes
app.doc31("/openapi.json", (c) => {
  const proto = c.req.header("x-forwarded-proto") ?? (c.req.url.startsWith("https") ? "https" : "http");
  const host = c.req.header("host") ?? "dak-news.com";
  return {
    openapi: "3.1.0",
    info: {
      title: "大案牍库 (The Grand Archive) API",
      description: "A real-time news database tracking 20+ authoritative sources across finance, geopolitics, tech, and social trending. Updated every 30 minutes.",
      version: "1.0.0",
    },
    servers: [{ url: `${proto}://${host}` }],
  };
});

// SEO routes (robots.txt, sitemap.xml) — before static file serving
app.route("/", seoRoutes);

// Serve UI static files in production
const staticDir = process.env.STATIC_DIR;
if (staticDir) {
  // Entry pages get server-side meta injection for crawlers
  app.route("/", entryMetaMiddleware(staticDir));

  app.use("/*", serveStatic({ root: staticDir + "/" }));
  // SPA fallback: serve index.html for non-API, non-file routes
  app.get("*", serveStatic({ path: staticDir + "/index.html" }));
}

// Bootstrap
const port = parseInt(process.env.PORT ?? "3000", 10);

async function main() {
  // Drop legacy auth tables so Better Auth can provision them cleanly.
  const DB_PATH = process.env.DB_PATH ?? "./data/dak.db";
  const db = new Database(DB_PATH, { create: true });
  db.exec("PRAGMA journal_mode = WAL");

  for (const t of ["users", "sessions", "account", "verification"]) {
    const exists = db
      .query<{ name: string }, [string]>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      )
      .get(t);
    if (exists) {
      // Check if this is a legacy table (BA tables have 'date' typed columns)
      const hasDateCol = db
        .query<{ type: string }, []>(`PRAGMA table_info(${t})`)
        .all()
        .some((r: any) => r.type.toLowerCase() === "date");
      if (!hasDateCol) db.exec(`DROP TABLE ${t}`);
    }
  }

  // Also clean up leftover temp tables from previous migrations
  for (const t of ["_users_old", "_users_tmp", "_sessions_old", "_sessions_tmp", "_api_keys_old", "_account_tmp", "_verification_tmp"]) {
    db.exec(`DROP TABLE IF EXISTS ${t}`);
  }

  // Drop api_keys if it references a now-dropped temp table
  const apiKeysSql = db
    .query<{ sql: string }, []>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='api_keys'",
    )
    .get();
  if (apiKeysSql && /_(users|sessions|api_keys)_(old|tmp|fix)/.test(apiKeysSql.sql)) {
    db.exec("DROP TABLE api_keys");
  }

  db.close();

  // Better Auth creates/migrates its own tables (users, sessions, account, verification)
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();

  // Our business tables (entries, api_keys)
  initDb();
  await buildSearchIndex();

  // Start serving only after all migrations complete (avoids race with BA table renames)
  Bun.serve({
    port,
    hostname: "0.0.0.0",
    fetch: app.fetch,
  });
  console.log(`🗄️  大案牍库 server listening on port ${port}`);
}

main();

// Export app for testing
export { app };
