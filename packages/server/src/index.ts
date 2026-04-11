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

  // Phase 2: Rebuild users table to make legacy columns (username, password) nullable.
  // BA OAuth creates users without username/password; NOT NULL constraint causes failure.
  // SQLite cannot ALTER COLUMN, so we recreate the table.
  const usernameInfo = db
    .query<{ notnull: number }, []>(`PRAGMA table_info(users)`)
    .all()
    .find((r: any) => r.name === "username");
  if (usernameInfo && usernameInfo.notnull === 1) {
    db.exec(`
      ALTER TABLE users RENAME TO _users_old;
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user',
        plan TEXT DEFAULT 'free',
        req_balance INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        name TEXT NOT NULL DEFAULT '',
        emailVerified INTEGER NOT NULL DEFAULT 0,
        image TEXT,
        createdAt TEXT NOT NULL DEFAULT '',
        updatedAt TEXT NOT NULL DEFAULT '',
        displayUsername TEXT,
        banned INTEGER DEFAULT 0,
        banReason TEXT,
        banExpires TEXT,
        reqBalance INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO users SELECT * FROM _users_old;
      DROP TABLE _users_old;
    `);
  }

  // Phase 2b: Rebuild sessions table to make legacy columns nullable.
  const userIdOldInfo = db
    .query<{ notnull: number }, []>(`PRAGMA table_info(sessions)`)
    .all()
    .find((r: any) => r.name === "user_id");
  if (userIdOldInfo && userIdOldInfo.notnull === 1) {
    db.exec(`
      ALTER TABLE sessions RENAME TO _sessions_old;
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        expires_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        token TEXT NOT NULL DEFAULT '',
        expiresAt TEXT NOT NULL DEFAULT '',
        createdAt TEXT NOT NULL DEFAULT '',
        updatedAt TEXT NOT NULL DEFAULT '',
        ipAddress TEXT,
        userAgent TEXT,
        userId TEXT NOT NULL DEFAULT '',
        impersonatedBy TEXT
      );
      INSERT INTO sessions SELECT * FROM _sessions_old;
      DROP TABLE _sessions_old;
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
  // Phase 3: Fix api_keys FK that points to _users_old (leftover from Phase 2 rename).
  const apiKeysSql = db
    .query<{ sql: string }, []>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='api_keys'"
    )
    .get();
  if (apiKeysSql && apiKeysSql.sql.includes("_users_old")) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      ALTER TABLE api_keys RENAME TO _api_keys_old;
      CREATE TABLE api_keys (
        id          TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        user_id     TEXT NOT NULL REFERENCES users(id),
        name        TEXT NOT NULL,
        prefix      TEXT NOT NULL,
        hash        TEXT NOT NULL,
        last_used   TEXT,
        created_at  TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO api_keys SELECT * FROM _api_keys_old;
      DROP TABLE _api_keys_old;
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
      accessTokenExpiresAt date,
      refreshTokenExpiresAt date,
      scope TEXT,
      password TEXT,
      createdAt date NOT NULL DEFAULT (datetime('now')),
      updatedAt date NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expiresAt date NOT NULL,
      createdAt date NOT NULL DEFAULT (datetime('now')),
      updatedAt date NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Phase 4: Fix date column types (TEXT → date) so BA matchType check passes.
  // BA expects 'date' typed columns; our earlier migrations created them as TEXT.
  const colType = (table: string, col: string) =>
    db
      .query<{ type: string }, []>(`PRAGMA table_info(${table})`)
      .all()
      .find((r: any) => r.name === col)?.type;

  if (colType("users", "createdAt") === "TEXT") {
    db.exec(`
      ALTER TABLE users RENAME TO _users_tmp;
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user',
        plan TEXT DEFAULT 'free',
        req_balance INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        name TEXT NOT NULL DEFAULT '',
        emailVerified INTEGER NOT NULL DEFAULT 0,
        image TEXT,
        createdAt date NOT NULL DEFAULT '',
        updatedAt date NOT NULL DEFAULT '',
        displayUsername TEXT,
        banned INTEGER DEFAULT 0,
        banReason TEXT,
        banExpires date,
        reqBalance INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO users SELECT * FROM _users_tmp;
      DROP TABLE _users_tmp;
    `);
  }
  if (colType("sessions", "expiresAt") === "TEXT") {
    db.exec(`
      ALTER TABLE sessions RENAME TO _sessions_tmp;
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        expires_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        token TEXT NOT NULL DEFAULT '',
        expiresAt date NOT NULL DEFAULT '',
        createdAt date NOT NULL DEFAULT '',
        updatedAt date NOT NULL DEFAULT '',
        ipAddress TEXT,
        userAgent TEXT,
        userId TEXT NOT NULL DEFAULT '',
        impersonatedBy TEXT
      );
      INSERT INTO sessions SELECT * FROM _sessions_tmp;
      DROP TABLE _sessions_tmp;
    `);
  }
  if (colType("account", "createdAt") === "TEXT") {
    db.exec(`
      ALTER TABLE account RENAME TO _account_tmp;
      CREATE TABLE account (
        id TEXT PRIMARY KEY,
        accountId TEXT NOT NULL,
        providerId TEXT NOT NULL,
        userId TEXT NOT NULL,
        accessToken TEXT,
        refreshToken TEXT,
        idToken TEXT,
        accessTokenExpiresAt date,
        refreshTokenExpiresAt date,
        scope TEXT,
        password TEXT,
        createdAt date NOT NULL DEFAULT (datetime('now')),
        updatedAt date NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO account SELECT * FROM _account_tmp;
      DROP TABLE _account_tmp;
    `);
  }
  if (colType("verification", "expiresAt") === "TEXT") {
    db.exec(`
      ALTER TABLE verification RENAME TO _verification_tmp;
      CREATE TABLE verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expiresAt date NOT NULL,
        createdAt date NOT NULL DEFAULT (datetime('now')),
        updatedAt date NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO verification SELECT * FROM _verification_tmp;
      DROP TABLE _verification_tmp;
    `);
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
