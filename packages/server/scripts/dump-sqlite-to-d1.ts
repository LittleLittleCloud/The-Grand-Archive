// Dump a SQLite database (e.g. the dak.db restored from R2 via litestream) into
// D1-importable SQL. Run with Bun:
//   bun run scripts/dump-sqlite-to-d1.ts <path-to-dak.db> > import.sql
//   wrangler d1 execute dak --remote --file import.sql
// Then rebuild FTS once: POST /api/admin/reindex (jieba runs in the worker).
//
// Emits INSERT OR IGNORE so it is safe to re-run / layer over existing rows.
import { Database } from "bun:sqlite";

const path = process.argv[2];
if (!path) {
  console.error("usage: bun run scripts/dump-sqlite-to-d1.ts <sqlite-file> > import.sql");
  process.exit(1);
}

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

// One row per statement: article content can be large, and multi-row batches
// hit SQLite's statement-size limit (SQLITE_TOOBIG). wrangler batches the file.
const CHUNK = 1;

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
  const rows = db.query(`SELECT * FROM ${t}`).all() as Record<string, unknown>[];
  const colList = cols.map(ident).join(", ");

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const values = chunk
      .map((r) => "(" + cols.map((c) => lit(r[c])).join(", ") + ")")
      .join(",\n  ");
    process.stdout.write(
      `INSERT OR IGNORE INTO ${ident(t)} (${colList}) VALUES\n  ${values};\n`
    );
  }
  console.error(`  ${t}: ${rows.length} rows`);
}

db.close();
