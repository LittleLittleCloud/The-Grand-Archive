import type { D1Database } from "@cloudflare/workers-types";
import { tokenize } from "./tokenizer";
import type { IndexedEntry, SearchOptions, SearchOutput } from "./interface";

/**
 * Rebuild the FTS index from the entries table (backfill after a data import).
 * Supports chunking via offset/limit so a large table can be indexed across
 * several requests without exceeding the Worker's memory limit. `clear` issues
 * the FTS5 'delete-all' command first (do this only on the first chunk).
 */
export async function rebuildFtsIndex(
  db: D1Database,
  opts?: { offset?: number; limit?: number; clear?: boolean }
): Promise<number> {
  if (opts?.clear ?? true) {
    await db.prepare("INSERT INTO entries_fts(entries_fts) VALUES('delete-all')").run();
  }

  let sql = "SELECT rowid, title, content FROM entries ORDER BY rowid";
  const binds: number[] = [];
  if (opts?.limit != null) {
    sql += " LIMIT ? OFFSET ?";
    binds.push(opts.limit, opts.offset ?? 0);
  }

  const { results } = await db
    .prepare(sql)
    .bind(...binds)
    .all<{ rowid: number; title: string; content: string | null }>();

  const insert = db.prepare(
    "INSERT INTO entries_fts(rowid, title, body) VALUES (?, ?, ?)"
  );

  const CHUNK = 100;
  for (let i = 0; i < results.length; i += CHUNK) {
    const batch = results
      .slice(i, i + CHUNK)
      .map((r) => insert.bind(r.rowid, tokenize(r.title), tokenize(r.content ?? "")));
    if (batch.length > 0) await db.batch(batch);
  }

  return results.length;
}

/**
 * Add new entries to the FTS index. Ingestion only inserts brand-new rows
 * (INSERT OR IGNORE upstream), so a plain insert keyed by entries.rowid is safe.
 */
export async function addToFtsIndex(
  db: D1Database,
  entries: IndexedEntry[]
): Promise<void> {
  if (entries.length === 0) return;

  const stmts = [];
  for (const entry of entries) {
    const row = await db
      .prepare("SELECT rowid FROM entries WHERE id = ?")
      .bind(entry.id)
      .first<{ rowid: number }>();
    if (!row) continue;
    stmts.push(
      db
        .prepare("INSERT INTO entries_fts(rowid, title, body) VALUES (?, ?, ?)")
        .bind(row.rowid, tokenize(entry.title), tokenize(entry.content ?? ""))
    );
  }
  if (stmts.length > 0) await db.batch(stmts);
}

/** Full-text search over the FTS index with filters + pagination. */
export async function searchFts(
  db: D1Database,
  query: string,
  options?: SearchOptions
): Promise<SearchOutput> {
  const tokenizedQuery = tokenize(query);
  if (!tokenizedQuery.trim()) {
    return { results: [], total: 0, tierFiltered: false };
  }

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.category) {
    conditions.push("e.category = ?");
    params.push(options.category);
  }
  if (options?.source) {
    conditions.push("e.source = ?");
    params.push(options.source);
  }

  let tierFiltered = false;
  const fromDate = options?.maxAge ?? options?.from;
  if (options?.maxAge) {
    const userFrom = options?.from;
    if (!userFrom || options.maxAge > userFrom) {
      tierFiltered = true;
    }
  }
  if (fromDate) {
    conditions.push("e.published >= ?");
    params.push(fromDate);
  }
  if (options?.to) {
    conditions.push("e.published <= ?");
    params.push(options.to);
  }

  const whereClause =
    conditions.length > 0 ? "AND " + conditions.join(" AND ") : "";

  // FTS5 MATCH query: quote each token to avoid syntax errors
  const ftsQuery = tokenizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, '""')}"`)
    .join(" OR ");

  const countRow = await db
    .prepare(
      `SELECT COUNT(*) as total
       FROM entries_fts f
       JOIN entries e ON e.rowid = f.rowid
       WHERE f.entries_fts MATCH ?
       ${whereClause}`
    )
    .bind(ftsQuery, ...params)
    .first<{ total: number }>();
  const total = countRow?.total ?? 0;

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  const { results } = await db
    .prepare(
      `SELECT e.id, e.title, e.url, e.source, e.category, e.published,
              rank * -1 as score
       FROM entries_fts f
       JOIN entries e ON e.rowid = f.rowid
       WHERE f.entries_fts MATCH ?
       ${whereClause}
       ORDER BY rank
       LIMIT ? OFFSET ?`
    )
    .bind(ftsQuery, ...params, limit, offset)
    .all<{
      id: string;
      title: string;
      url: string;
      source: string;
      category: string;
      published: string;
      score: number;
    }>();

  return {
    results: results.map((r) => ({
      id: r.id,
      title: r.title,
      url: r.url,
      source: r.source,
      category: r.category,
      published: r.published,
      score: r.score,
    })),
    total,
    tierFiltered,
  };
}
