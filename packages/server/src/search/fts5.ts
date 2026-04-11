import { getDb } from "../db/client";
import { tokenize } from "./tokenizer";
import type {
  SearchEngine,
  IndexedEntry,
  SearchOptions,
  SearchOutput,
} from "./interface";

export class Fts5SearchEngine implements SearchEngine {
  async init(): Promise<void> {
    const db = getDb();

    // Create FTS5 virtual table (content-less: we join back to entries for metadata)
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
        title,
        body,
        content='',
        content_rowid='rowid'
      );
    `);

    // Rebuild index from entries table
    const rows = db
      .query("SELECT rowid, id, title, content FROM entries")
      .all() as { rowid: number; id: string; title: string; content: string | null }[];

    // Clear and repopulate
    db.exec("DELETE FROM entries_fts");

    const insert = db.prepare(
      "INSERT INTO entries_fts(rowid, title, body) VALUES (?, ?, ?)"
    );
    const insertAll = db.transaction(
      (items: { rowid: number; title: string; content: string | null }[]) => {
        for (const item of items) {
          insert.run(item.rowid, tokenize(item.title), tokenize(item.content ?? ""));
        }
      }
    );

    insertAll(rows);
    console.log(`🔍 FTS5 index built: ${rows.length} entries`);
  }

  add(entries: IndexedEntry[]): void {
    const db = getDb();

    // Look up rowid for each entry and upsert into FTS
    const getRowid = db.prepare(
      "SELECT rowid FROM entries WHERE id = ?"
    );
    const deleteFts = db.prepare(
      "INSERT INTO entries_fts(entries_fts, rowid, title, body) VALUES('delete', ?, ?, ?)"
    );
    const insertFts = db.prepare(
      "INSERT INTO entries_fts(rowid, title, body) VALUES (?, ?, ?)"
    );

    const upsert = db.transaction((items: IndexedEntry[]) => {
      for (const entry of items) {
        const row = getRowid.get(entry.id) as { rowid: number } | null;
        if (!row) continue;

        const tokenizedTitle = tokenize(entry.title);
        const tokenizedContent = tokenize(entry.content ?? "");

        // Try delete old entry first (ignore if not there)
        try {
          deleteFts.run(row.rowid, tokenizedTitle, tokenizedContent);
        } catch {
          // Entry may not exist in FTS yet, that's fine
        }
        insertFts.run(row.rowid, tokenizedTitle, tokenizedContent);
      }
    });

    upsert(entries);
  }

  search(query: string, options?: SearchOptions): SearchOutput {
    const db = getDb();

    const tokenizedQuery = tokenize(query);
    if (!tokenizedQuery.trim()) {
      return { results: [], total: 0, tierFiltered: false };
    }

    // Build WHERE clauses for filtering
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

    // Determine effective date range
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

    // FTS5 match query: quote each token to avoid syntax errors
    const ftsQuery = tokenizedQuery
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => `"${t.replace(/"/g, '""')}"`)
      .join(" OR ");

    // Count total
    const countSql = `
      SELECT COUNT(*) as total
      FROM entries_fts f
      JOIN entries e ON e.rowid = f.rowid
      WHERE f.entries_fts MATCH ?
      ${whereClause}
    `;
    const countRow = db.query(countSql).get(ftsQuery, ...params) as {
      total: number;
    };
    const total = countRow.total;

    // Fetch page
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    const selectSql = `
      SELECT e.id, e.title, e.source, e.category, e.published,
             rank * -1 as score
      FROM entries_fts f
      JOIN entries e ON e.rowid = f.rowid
      WHERE f.entries_fts MATCH ?
      ${whereClause}
      ORDER BY rank
      LIMIT ? OFFSET ?
    `;

    const rows = db
      .query(selectSql)
      .all(ftsQuery, ...params, limit, offset) as {
      id: string;
      title: string;
      source: string;
      category: string;
      published: string;
      score: number;
    }[];

    return {
      results: rows.map((r) => ({
        id: r.id,
        title: r.title,
        source: r.source,
        category: r.category,
        published: r.published,
        score: r.score,
      })),
      total,
      tierFiltered,
    };
  }

  dispose(): void {
    // FTS5 table lives in the DB, nothing to dispose
  }
}
