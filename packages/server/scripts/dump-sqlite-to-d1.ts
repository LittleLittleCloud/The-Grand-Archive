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
const TABLES = ["entries", "users", "sessions", "account", "verification", "api_keys"];

function ident(s: string): string {
  return '"' + s.replace(/"/g, '""') + '"';
}

function lit(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Uint8Array) return "X'" + Buffer.from(v).toString("hex") + "'";
  return "'" + String(v).replace(/'/g, "''") + "'";
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

  const cols = (db.query(`PRAGMA table_info(${t})`).all() as { name: string }[]).map(
    (r) => r.name
  );
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
