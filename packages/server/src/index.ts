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
  // Bridge legacy schema → Better Auth schema before BA migration runs.
  // SQLite cannot ALTER TABLE ADD COLUMN … NOT NULL without a DEFAULT,
  // so we pre-add the columns that BA would fail on.
  const DB_PATH = process.env.DB_PATH ?? "./data/dak.db";
  const db = new Database(DB_PATH, { create: true });
  db.exec("PRAGMA journal_mode = WAL");
  const cols = (col: string, table: string) =>
    db
      .query<{ name: string }, []>(`PRAGMA table_info(${table})`)
      .all()
      .some((r) => r.name === col);

  // Only run if legacy users table exists but BA columns are missing
  if (cols("username", "users") && !cols("name", "users")) {
    // SQLite ALTER TABLE requires constant defaults for NOT NULL columns
    db.exec(`
      ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT '';
      ALTER TABLE users ADD COLUMN emailVerified INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN image TEXT;
      ALTER TABLE users ADD COLUMN createdAt TEXT NOT NULL DEFAULT '';
      ALTER TABLE users ADD COLUMN updatedAt TEXT NOT NULL DEFAULT '';
      ALTER TABLE users ADD COLUMN displayUsername TEXT;
      ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0;
      ALTER TABLE users ADD COLUMN banReason TEXT;
      ALTER TABLE users ADD COLUMN banExpires TEXT;
      ALTER TABLE users ADD COLUMN reqBalance INTEGER NOT NULL DEFAULT 0;
      -- Backfill from legacy columns
      UPDATE users SET name = username, createdAt = created_at, updatedAt = created_at WHERE name = '';
    `);
  }
  if (cols("expires_at", "sessions") && !cols("token", "sessions")) {
    db.exec(`
      ALTER TABLE sessions ADD COLUMN token TEXT NOT NULL DEFAULT '';
      ALTER TABLE sessions ADD COLUMN expiresAt TEXT NOT NULL DEFAULT '';
      ALTER TABLE sessions ADD COLUMN createdAt TEXT NOT NULL DEFAULT '';
      ALTER TABLE sessions ADD COLUMN updatedAt TEXT NOT NULL DEFAULT '';
      ALTER TABLE sessions ADD COLUMN ipAddress TEXT;
      ALTER TABLE sessions ADD COLUMN userAgent TEXT;
      ALTER TABLE sessions ADD COLUMN userId TEXT NOT NULL DEFAULT '';
      ALTER TABLE sessions ADD COLUMN impersonatedBy TEXT;
      -- Backfill from legacy columns
      UPDATE sessions SET userId = user_id, expiresAt = expires_at, createdAt = created_at, updatedAt = created_at WHERE userId = '';
    `);
  }
  // Create account & verification tables if missing (BA needs them)
  db.exec(`
    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      accountId TEXT NOT NULL,
      providerId TEXT NOT NULL,
      userId TEXT NOT NULL,
      accessToken TEXT,
      refreshToken TEXT,
      idToken TEXT,
      accessTokenExpiresAt TEXT,
      refreshTokenExpiresAt TEXT,
      scope TEXT,
      password TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  db.close();

  // Better Auth creates/migrates its own tables (users, sessions, account, verification)
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();

  // Our business tables (entries, api_keys)
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
