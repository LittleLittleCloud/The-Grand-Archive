// Dump a SQLite database (e.g. the dak.db restored from R2 via litestream) into
// D1-importable SQL. Run with Bun.
//
// Single file (small DBs):
//   bun run scripts/dump-sqlite-to-d1.ts <dak.db> > import.sql
//   wrangler d1 execute dak --remote --file import.sql
//
// Split into chunked files (large DBs — avoids wrangler --file size limits):
//   bun run scripts/dump-sqlite-to-d1.ts <dak.db> <out-dir> [stmtsPerFile=2000]
//   for f in <out-dir>/part-*.sql; do wrangler d1 execute dak --remote --file "$f"; done
//
// Then rebuild FTS: POST /api/admin/reindex (chunked; jieba runs in the worker).
// Emits INSERT OR IGNORE so it is safe to re-run / layer over existing rows.
import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const path = process.argv[2];
if (!path) {
  console.error("usage: bun run scripts/dump-sqlite-to-d1.ts <sqlite-file> [out-dir] [stmtsPerFile]");
  process.exit(1);
}
const outDir = process.argv[3];
const stmtsPerFile = parseInt(process.argv[4] ?? "2000", 10);

const db = new Database(path, { readonly: true });

// Business + Better Auth tables. FTS is NOT dumped (rebuilt in-worker afterward).
// Optionally restrict to a subset via ONLY_TABLES=users,api_keys (comma list),
// e.g. to re-import just the auth tables without re-processing all entries.
const ALL_TABLES = ["entries", "users", "sessions", "account", "verification", "api_keys"];
const only = process.env.ONLY_TABLES?.split(",").map((s) => s.trim()).filter(Boolean);
const TABLES = only?.length ? ALL_TABLES.filter((t) => only.includes(t)) : ALL_TABLES;

// Target D1 schema (see migrations/0001_init.sql + 0002_auth.sql). The source
// dak.db carries legacy columns from earlier migrations (e.g. users.password,
// users.req_balance, users.created_at) that do NOT exist in the D1 tables. We
// only dump the intersection of source columns and these target columns, so
// those legacy columns are dropped instead of producing "no such column" errors
// that abort the rest of an import file.
const TARGET_COLUMNS: Record<string, string[]> = {
  entries: [
    "id", "title", "content", "url", "source", "category",
    "tags", "author", "language", "published", "created_at",
  ],
  users: [
    "id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt",
    "username", "displayUsername", "role", "banned", "banReason", "banExpires",
    "plan", "reqBalance",
  ],
  sessions: [
    "id", "expiresAt", "token", "createdAt", "updatedAt",
    "ipAddress", "userAgent", "userId", "impersonatedBy",
  ],
  account: [
    "id", "accountId", "providerId", "userId", "accessToken", "refreshToken",
    "idToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope",
    "password", "createdAt", "updatedAt",
  ],
  verification: ["id", "identifier", "value", "expiresAt", "createdAt", "updatedAt"],
  api_keys: ["id", "user_id", "name", "prefix", "hash", "last_used", "created_at"],
};

function ident(s: string): string {
  return '"' + s.replace(/"/g, '""') + '"';
}

// D1 rejects SQL statements over ~100 KB (measured in BYTES). Content is mostly
// CJK (~3 bytes/char in UTF-8), so cap by byte length, not character count.
const MAX_CONTENT_BYTES = 88000;
const encoder = new TextEncoder();

function capToBytes(s: string, maxBytes: number): string {
  // Fast path: even at 4 bytes/char this can't exceed the limit.
  if (s.length * 4 <= maxBytes) return s;
  if (encoder.encode(s).length <= maxBytes) return s;
  let lo = 0;
  let hi = s.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (encoder.encode(s.slice(0, mid)).length <= maxBytes) lo = mid;
    else hi = mid - 1;
  }
  return s.slice(0, lo);
}

function lit(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Uint8Array) return "X'" + Buffer.from(v).toString("hex") + "'";
  const capped = capToBytes(String(v), MAX_CONTENT_BYTES);
  return "'" + capped.replace(/'/g, "''") + "'";
}

let buffer: string[] = [];
let fileIndex = 0;
let total = 0;

if (outDir) mkdirSync(outDir, { recursive: true });

function flush(): void {
  if (buffer.length === 0) return;
  fileIndex++;
  const name = join(outDir!, `part-${String(fileIndex).padStart(4, "0")}.sql`);
  writeFileSync(name, buffer.join("\n") + "\n");
  console.error(`  wrote ${name} (${buffer.length} statements)`);
  buffer = [];
}

function emit(stmt: string): void {
  total++;
  if (outDir) {
    buffer.push(stmt);
    if (buffer.length >= stmtsPerFile) flush();
  } else {
    process.stdout.write(stmt + "\n");
  }
}

for (const t of TABLES) {
  const exists = db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(t);
  if (!exists) {
    console.error(`  (skip ${t}: not present)`);
    continue;
  }

  const sourceCols = new Set(
    (db.query(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((r) => r.name)
  );
  // Keep target-schema order, but only columns the source actually has. Any
  // target column missing from the source falls back to its D1 default; any
  // source-only (legacy) column is dropped.
  const target = TARGET_COLUMNS[t];
  const cols = target
    ? target.filter((c) => sourceCols.has(c))
    : [...sourceCols];
  const colList = cols.map(ident).join(", ");
  const rows = db.query(`SELECT * FROM ${t}`).all() as Record<string, unknown>[];

  // One complete statement per row (content can contain newlines; splitting only
  // ever happens between whole statements, never mid-statement).
  for (const row of rows) {
    const values = "(" + cols.map((c) => lit(row[c])).join(", ") + ")";
    emit(`INSERT OR IGNORE INTO ${ident(t)} (${colList}) VALUES ${values};`);
  }
  console.error(`  ${t}: ${rows.length} rows`);
}

flush();
db.close();
console.error(`Total: ${total} statements${outDir ? `, ${fileIndex} files in ${outDir}` : ""}`);
