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
import { auth } from "./auth/better-auth";
import { getMigrations } from "better-auth/db/migration";
import { Database } from "bun:sqlite";

const app = new Hono();

// Global middleware
app.use("*", cors());

// Better Auth handles /api/auth/*
app.on(["POST", "GET"], "/api/auth/**", (c) => auth.handler(c.req.raw));

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
  for (const t of ["_users_old", "_sessions_old", "_api_keys_old"]) {
    db.exec(`DROP TABLE IF EXISTS ${t}`);
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
